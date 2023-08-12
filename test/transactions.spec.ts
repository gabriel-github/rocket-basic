import request from 'supertest'
import { expect, it, beforeAll, beforeEach, afterAll, describe } from 'vitest'
import { app } from '../src/app'
import {execSync} from 'node:child_process'

describe('Transactions routes', () => {

  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    const response = await request(app.server).post('/transactions').send({
      title: 'New Transaction',
      amount: 500,
      type: 'credit'
    }).expect(201)
  })

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server).post('/transactions').send({
      title: 'New Transaction',
      amount: 500,
      type: 'credit'
    })

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New Transaction',
        amount: 500,
      })
    ])

  })

  it('should be able to to get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server).post('/transactions').send({
      title: 'New Transaction',
      amount: 500,
      type: 'credit'
    })

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

      const transactionId = listTransactionsResponse.body.transactions[0].id

      const getTransactionsResponse =  await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactionsResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New Transaction',
        amount: 500,
      })
    )

  })

  it('should be able to get summary', async () => {
    const createTransactionResponse = await request(app.server).post('/transactions').send({
      title: 'Credit Transaction',
      amount: 5000,
      type: 'credit'
    })

    const cookies = createTransactionResponse.get('Set-Cookie')

    await request(app.server).post('/transactions').send({
      title: 'Debit Transaction',
      amount: 2000,
      type: 'debit'
    }).set('Cookie', cookies)


    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(summaryResponse.body.summary).toEqual({
      amount: 3000
    })

  })
})
