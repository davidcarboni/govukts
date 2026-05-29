import { button } from './components/button'

// Standard submit button
const submit = button({ text: 'Save and continue' })

// Start button (renders with an arrow icon)
const start = button({ text: 'Start now', isStartButton: true })

// Link styled as a button
const link = button({ text: 'Go somewhere', href: '/somewhere' })

// Disabled button
const disabled = button({ text: 'Not available', disabled: true })

console.log('=== Submit ===')
console.log(submit)

console.log('\n=== Start button ===')
console.log(start)

console.log('\n=== Link button ===')
console.log(link)

console.log('\n=== Disabled ===')
console.log(disabled)
