import { FastifyInstance } from "fastify"
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from "../database"
import { CheckSessionIdExists } from "../middlewares/check-session-id-exists"

export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    console.log(`[${req.method}] ${req.url}`)
  })

  app.get('/', {
    preHandler: [CheckSessionIdExists]
  }, async (req, reply) => {
    const { sessionId } = req.cookies

    const transactions = await knex('transactions').where('session_id', sessionId).select()

    return { transactions }
  })

  app.get('/:id', {
    preHandler: [CheckSessionIdExists]
  }, async (req) => {
    const { sessionId } = req.cookies

    const getTransactionsParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = getTransactionsParamsSchema.parse(req.params)

    const transaction = await knex('transactions').where({
      session_id: sessionId,
      id
    }).first()

    if (!transaction) {
      throw new Error('Transaction not found!')
    }

    return { transaction }
  })

  app.get('/summary', {
    preHandler: [CheckSessionIdExists]
  }, async (req) => {
    const { sessionId } = req.cookies

    const summary = await knex('transactions').where('session_id', sessionId).sum('amount', { as: 'amount' }).first()

    return { summary }
  })

  app.post('/', async (req, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    const { title, amount, type } = createTransactionBodySchema.parse(req.body)

    let sessionId = req.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }


    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })

    return reply.status(201).send()
  })

}