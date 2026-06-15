import DefaultTheme from 'vitepress/theme'
import Playground from './components/Playground.vue'
import RotatingText from './components/RotatingText.vue'
import CostCalculator from './components/CostCalculator.vue'
import HowItWorks from './components/HowItWorks.vue'
import LanguageStrip from './components/LanguageStrip.vue'
import ButtonBar from './components/ButtonBar.vue'
import FeatureCards from './components/FeatureCards.vue'
import './custom.css'
import mediumZoom from 'medium-zoom'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground)
    app.component('RotatingText', RotatingText)
    app.component('CostCalculator', CostCalculator)
    app.component('HowItWorks', HowItWorks)
    app.component('LanguageStrip', LanguageStrip)
    app.component('ButtonBar', ButtonBar)
    app.component('FeatureCards', FeatureCards)
  },
  setup() {
    const route = useRoute()
    const initZoom = () => {
      mediumZoom('.main img', { background: 'var(--vp-c-bg)' })
    }
    onMounted(() => initZoom())
    watch(() => route.path, () => nextTick(() => initZoom()))
  },
}
