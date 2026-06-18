import DefaultTheme from 'vitepress/theme'
import Playground from './components/Playground.vue'
import RotatingText from './components/RotatingText.vue'
import CostCalculator from './components/CostCalculator.vue'
import HowItWorks from './components/HowItWorks.vue'
import LanguageStrip from './components/LanguageStrip.vue'
import ButtonBar from './components/ButtonBar.vue'
import FeatureCards from './components/FeatureCards.vue'
import PluginStrip from './components/PluginStrip.vue'
import ProxyCallout from './components/ProxyCallout.vue'
import BeforeAfter from './components/BeforeAfter.vue'
import NotAToon from './components/NotAToon.vue'
import GrammarRef from './components/GrammarRef.vue'
import CodeSnippet from './components/CodeSnippet.vue'
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
    app.component('PluginStrip', PluginStrip)
    app.component('ProxyCallout', ProxyCallout)
    app.component('BeforeAfter', BeforeAfter)
    app.component('NotAToon', NotAToon)
    app.component('GrammarRef', GrammarRef)
    app.component('CodeSnippet', CodeSnippet)
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
