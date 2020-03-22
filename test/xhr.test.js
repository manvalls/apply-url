import sinon from 'sinon'
import expect from 'expect'
import { one, html } from 'jwit'
import applyURL from '../src/applyURL'

describe('xhr transport', () => {
  let server

  beforeEach(() => {
    server = sinon.createFakeServer({
      autoRespond: true,
    })

    document.body.innerHTML = ''
  })

  afterEach(() => {
    server.restore()
  })

  it('should work', async () => {
    server.respondWith([
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(
        one('body',
          html('<div>foo</div> <div>bar</div>'),
        ),
      ),
    ])

    await applyURL()
    expect(document.body.innerHTML).toBe('<div>foo</div> <div>bar</div>')
  })
})
