import { ListaUsuariosSchema, UsuarioSchema, type Usuario } from '@econference/shared'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ServicoAuthAdmin } from '../src/auth-admin.js'
import { buildApp } from '../src/build-app.js'
import { criarServicoUsuarios, type RepositorioUsuarios } from '../src/usuarios.js'
import { comoUsuario, envTeste, PERFIS_TESTE, repositorioEmMemoria, USUARIOS } from './helpers.js'

/** Banco e Supabase Auth falsos, em memória. */
function criarFalsos() {
  const usuarios = new Map<string, Usuario>(
    PERFIS_TESTE.map((p) => [p.id, { ...p, criadoEm: '2026-11-24T00:00:00Z' }]),
  )
  const auth = {
    senhas: new Map<string, string>(),
    bloqueados: new Set<string>(),
    excluidos: [] as string[],
    falharCriacaoDoPerfil: false,
  }

  const authAdmin: ServicoAuthAdmin = {
    async criarUsuario({ email, senha }) {
      if ([...usuarios.values()].some((u) => u.email === email)) {
        throw Object.assign(new Error('Já existe um usuário com este e-mail.'), { statusCode: 409 })
      }
      const id = randomUUID()
      auth.senhas.set(id, senha)
      return { id }
    },
    async definirSenha(id, senha) {
      auth.senhas.set(id, senha)
    },
    async bloquear(id, bloqueado) {
      if (bloqueado) auth.bloqueados.add(id)
      else auth.bloqueados.delete(id)
    },
    async excluir(id) {
      auth.excluidos.push(id)
      auth.senhas.delete(id)
    },
  }

  const repo: RepositorioUsuarios = {
    listar: async () => [...usuarios.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    buscar: async (id) => usuarios.get(id) ?? null,
    buscarPorEmail: async (email) => [...usuarios.values()].find((u) => u.email === email) ?? null,
    contarAdminsAtivos: async (excetoId) =>
      [...usuarios.values()].filter((u) => u.papel === 'admin' && u.ativo && u.id !== excetoId)
        .length,
    async criar(_ator, dados) {
      if (auth.falharCriacaoDoPerfil) throw new Error('falha no banco')
      usuarios.set(dados.id, {
        ...dados,
        ativo: true,
        trocaSenhaPendente: true,
        criadoEm: new Date().toISOString(),
      })
    },
    async atualizar(_ator, id, campos) {
      const atual = usuarios.get(id)!
      usuarios.set(id, {
        ...atual,
        ...Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)),
      })
    },
    async registrarSenhaProvisoria(_ator, id) {
      usuarios.set(id, { ...usuarios.get(id)!, trocaSenhaPendente: true })
    },
  }
  return { usuarios, auth, authAdmin, repo }
}

describe('UC02 — usuários', () => {
  let falsos: ReturnType<typeof criarFalsos>
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeEach(async () => {
    falsos = criarFalsos()
    app = await buildApp({
      env: envTeste,
      db: null,
      perfis: repositorioEmMemoria(),
      usuarios: falsos.repo,
      authAdmin: falsos.authAdmin,
    })
  })
  afterEach(() => app.close())

  const chamar = async (
    method: 'GET' | 'POST' | 'PATCH',
    url: string,
    usuario: string = USUARIOS.admin,
    payload?: object,
  ) =>
    app.inject({
      method,
      url,
      headers: await comoUsuario(usuario),
      ...(payload ? { payload } : {}),
    })

  const novo = {
    nome: 'Maria Produção',
    email: 'Maria@RotexMaquinas.com.br',
    papel: 'producao',
    senhaProvisoria: 'Rotex123',
  }

  describe('permissões', () => {
    it.each([
      ['GET', '/usuarios'],
      ['POST', '/usuarios'],
      ['PATCH', `/usuarios/${USUARIOS.pcp}`],
      ['POST', `/usuarios/${USUARIOS.pcp}/redefinir-senha`],
    ] as const)('%s %s: 401 sem token', async (method, url) => {
      const res = await app.inject({ method, url })
      expect(res.statusCode).toBe(401)
    })

    it.each([USUARIOS.engenharia, USUARIOS.producao, USUARIOS.pcp])(
      'só o admin: 403 para os outros papéis (%s)',
      async (usuario) => {
        expect((await chamar('GET', '/usuarios', usuario)).statusCode).toBe(403)
        expect((await chamar('POST', '/usuarios', usuario, novo)).statusCode).toBe(403)
      },
    )
  })

  it('lista os usuários', async () => {
    const res = await chamar('GET', '/usuarios')
    expect(res.statusCode).toBe(200)
    expect(ListaUsuariosSchema.parse(res.json())).toHaveLength(PERFIS_TESTE.length)
  })

  describe('criar', () => {
    it('cria com senha provisória e troca pendente; e-mail em minúsculas', async () => {
      const res = await chamar('POST', '/usuarios', USUARIOS.admin, novo)
      expect(res.statusCode).toBe(201)
      const criado = UsuarioSchema.parse(res.json())
      expect(criado).toMatchObject({
        nome: 'Maria Produção',
        email: 'maria@rotexmaquinas.com.br',
        papel: 'producao',
        ativo: true,
        trocaSenhaPendente: true,
      })
      expect(falsos.auth.senhas.get(criado.id)).toBe('Rotex123')
    })

    it('409 com e-mail já cadastrado', async () => {
      const res = await chamar('POST', '/usuarios', USUARIOS.admin, {
        ...novo,
        email: 'pcp@rotexmaquinas.com.br',
      })
      expect(res.statusCode).toBe(409)
      expect(res.json<{ message: string }>().message).toBe('Já existe um usuário com este e-mail.')
    })

    it('400 com dados inválidos', async () => {
      const res = await chamar('POST', '/usuarios', USUARIOS.admin, {
        ...novo,
        email: 'invalido',
        senhaProvisoria: '123',
      })
      expect(res.statusCode).toBe(400)
      expect(res.json<{ message: string }>().message).toMatch(/E-mail inválido/)
    })

    it('se o banco falha, desfaz o usuário no Supabase Auth', async () => {
      falsos.auth.falharCriacaoDoPerfil = true
      const res = await chamar('POST', '/usuarios', USUARIOS.admin, novo)
      expect(res.statusCode).toBe(500)
      expect(falsos.auth.excluidos).toHaveLength(1)
    })
  })

  describe('alterar', () => {
    it('muda papel e nome', async () => {
      const res = await chamar('PATCH', `/usuarios/${USUARIOS.pcp}`, USUARIOS.admin, {
        papel: 'engenharia',
        nome: 'Novo nome',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ papel: 'engenharia', nome: 'Novo nome' })
    })

    it('desativar bloqueia o login no Auth; reativar desbloqueia', async () => {
      await chamar('PATCH', `/usuarios/${USUARIOS.pcp}`, USUARIOS.admin, { ativo: false })
      expect(falsos.usuarios.get(USUARIOS.pcp)?.ativo).toBe(false)
      expect(falsos.auth.bloqueados.has(USUARIOS.pcp)).toBe(true)

      await chamar('PATCH', `/usuarios/${USUARIOS.pcp}`, USUARIOS.admin, { ativo: true })
      expect(falsos.auth.bloqueados.has(USUARIOS.pcp)).toBe(false)
    })

    it('admin não se desativa nem tira o próprio papel de admin', async () => {
      const desativar = await chamar('PATCH', `/usuarios/${USUARIOS.admin}`, USUARIOS.admin, {
        ativo: false,
      })
      expect(desativar.statusCode).toBe(422)
      expect(desativar.json<{ message: string }>().message).toBe(
        'Você não pode desativar o próprio usuário.',
      )
      const rebaixar = await chamar('PATCH', `/usuarios/${USUARIOS.admin}`, USUARIOS.admin, {
        papel: 'pcp',
      })
      expect(rebaixar.statusCode).toBe(422)
    })

    it('não deixa o sistema sem administrador ativo (regra do serviço)', async () => {
      // Pela API o ator é sempre um admin ativo (conta como 1). A regra protege outros chamadores.
      const servico = criarServicoUsuarios(falsos.repo, falsos.authAdmin)
      const semAdmin = randomUUID()
      await expect(servico.atualizar(semAdmin, USUARIOS.admin, { papel: 'pcp' })).rejects.toThrow(
        'O sistema precisa de pelo menos um administrador ativo.',
      )
      await expect(servico.atualizar(semAdmin, USUARIOS.admin, { ativo: false })).rejects.toThrow(
        'O sistema precisa de pelo menos um administrador ativo.',
      )
    })

    it('404 para usuário inexistente', async () => {
      const res = await chamar('PATCH', `/usuarios/${randomUUID()}`, USUARIOS.admin, {
        ativo: false,
      })
      expect(res.statusCode).toBe(404)
    })

    it('400 sem nenhum campo e com id inválido', async () => {
      expect(
        (await chamar('PATCH', `/usuarios/${USUARIOS.pcp}`, USUARIOS.admin, {})).statusCode,
      ).toBe(400)
      expect(
        (await chamar('PATCH', '/usuarios/abc', USUARIOS.admin, { ativo: true })).statusCode,
      ).toBe(400)
    })
  })

  it('redefinir senha: nova provisória e troca pendente de novo', async () => {
    const res = await chamar('POST', `/usuarios/${USUARIOS.pcp}/redefinir-senha`, USUARIOS.admin, {
      senhaProvisoria: 'Nova123',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ trocaSenhaPendente: true })
    expect(falsos.auth.senhas.get(USUARIOS.pcp)).toBe('Nova123')
  })
})

describe('UC02 sem configuração', () => {
  it('503 quando falta SUPABASE_SECRET_KEY ou banco', async () => {
    const app = await buildApp({ env: envTeste, db: null, perfis: repositorioEmMemoria() })
    const res = await app.inject({
      method: 'GET',
      url: '/usuarios',
      headers: await comoUsuario(USUARIOS.admin),
    })
    expect(res.statusCode).toBe(503)
    await app.close()
  })
})
