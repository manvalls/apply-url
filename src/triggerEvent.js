
const triggerEvent = (eventType, options = {}, detail) => {
  try {
    const capitalizedEventType = eventType[0].toUpperCase() + eventType.slice(1)

    const event = new CustomEvent((options.prefix || 'au-') + eventType, {
      bubbles: options.bubbles !== false,
      composed: options.composed !== false,
      cancelable: !!options['cancelable' + capitalizedEventType],
      detail,
    })

    if (options['before' + capitalizedEventType]) {
      options['before' + capitalizedEventType](event)
    }

    if (options.target) {
      options.target.dispatchEvent(event)
    }

    if (options['after' + capitalizedEventType]) {
      options['after' + capitalizedEventType](event)
    }
  } catch (err) {
    setTimeout(() => {
      throw err
    })
  }
}

export default triggerEvent
