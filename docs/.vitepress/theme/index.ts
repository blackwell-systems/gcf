import DefaultTheme from 'vitepress/theme'
import Playground from './components/Playground.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground)
  },
}
