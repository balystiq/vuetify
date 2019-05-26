// Styles
import './VSlideGroup.sass'

// Components
import VIcon from '../VIcon'
import { VFadeTransition } from '../transitions'

// Extensions
import { BaseItemGroup } from '../VItemGroup/VItemGroup'

// Directives
import Resize from '../../directives/resize'
import Touch from '../../directives/touch'

// Utilities
import mixins, { ExtractVue } from '../../util/mixins'

// Types
import Vue, { VNode } from 'vue'

interface TouchEvent {
  touchstartX: number
  touchmoveX: number
}

interface options extends Vue {
  $refs: {
    content: HTMLElement
    wrapper: HTMLElement
  }
}

export const BaseSlideGroup = mixins<options &
/* eslint-disable indent */
  ExtractVue<typeof BaseItemGroup>
/* eslint-enable indent */
>(
  BaseItemGroup
  /* @vue/component */
).extend({
  name: 'base-slide-group',

  directives: {
    Resize,
    Touch
  },

  props: {
    activeClass: {
      type: String,
      default: 'v-slide-item--active'
    },
    nextIcon: {
      type: String,
      default: '$vuetify.icons.next'
    },
    mobileBreakPoint: {
      type: [Number, String],
      default: 1264,
      validator: (v: any) => !isNaN(parseInt(v))
    },
    prevIcon: {
      type: String,
      default: '$vuetify.icons.prev'
    },
    showArrows: Boolean
  },

  data: () => ({
    isOverflowing: false,
    resizeTimeout: 0,
    startX: 0,
    scrollOffset: 0,
    widths: {
      content: 0,
      wrapper: 0
    }
  }),

  computed: {
    __cachedNext (): VNode {
      return this.genTransition('next')
    },
    __cachedPrev (): VNode {
      return this.genTransition('prev')
    },
    classes (): object {
      return {
        ...BaseItemGroup.options.computed.classes.call(this),
        'v-slide-group': true
      }
    },
    hasAffixes (): Boolean {
      return (
        (this.showArrows || !this.isMobile) &&
        this.isOverflowing
      )
    },
    hasNext (): boolean {
      if (!this.hasAffixes) return false

      const { content, wrapper } = this.widths

      // Check one scroll ahead to know the width of right-most item
      return content > Math.abs(this.scrollOffset) + wrapper
    },
    hasPrev (): boolean {
      return this.hasAffixes && this.scrollOffset !== 0
    },
    isMobile (): boolean {
      return this.$vuetify.breakpoint.width < this.mobileBreakPoint
    }
  },

  watch: {
    internalValue: 'setWidths',
    // When overflow changes, the arrows alter
    // the widths of the content and wrapper
    // and need to be recalculated
    isOverflowing: 'setWidths',
    scrollOffset (val) {
      this.$refs.content.style.transform = `translateX(${-val}px)`
    }
  },

  methods: {
    genNext (): VNode | null {
      if (!this.hasAffixes) return null

      const slot = this.$scopedSlots.next
        ? this.$scopedSlots.next({})
        : this.$slots.next || this.__cachedNext

      return this.$createElement('div', {
        staticClass: 'v-slide-group__next',
        class: {
          'v-slide-group__next--disabled': !this.hasNext
        },
        on: {
          click: () => this.onAffixClick('next')
        },
        key: 'next'
      }, [slot])
    },
    genContent (): VNode {
      return this.$createElement('div', {
        staticClass: 'v-slide-group__content',
        ref: 'content'
      }, this.$slots.default)
    },
    genData (): object {
      return {
        class: this.classes,
        directives: [{
          name: 'resize',
          value: this.onResize
        }]
      }
    },
    genIcon (location: 'prev' | 'next'): VNode | null {
      let icon = location

      if (this.$vuetify.rtl && location === 'prev') {
        icon = 'next'
      } else if (this.$vuetify.rtl && location === 'next') {
        icon = 'prev'
      }

      const upperLocation = `${location[0].toUpperCase()}${location.slice(1)}`
      const hasAffix = (this as any)[`has${upperLocation}`]

      if (
        !this.showArrows &&
        !hasAffix
      ) return null

      return this.$createElement(VIcon, {
        props: {
          disabled: !hasAffix
        }
      }, (this as any)[`${icon}Icon`])
    },
    genPrev (): VNode | null {
      if (!this.hasAffixes) return null

      const slot = this.$scopedSlots.prev
        ? this.$scopedSlots.prev({})
        : this.$slots.prev || this.__cachedPrev

      return this.$createElement('div', {
        staticClass: 'v-slide-group__prev',
        class: {
          'v-slide-group__prev--disabled': !this.hasPrev
        },
        on: {
          click: () => this.onAffixClick('prev')
        },
        key: 'prev'
      }, [slot])
    },
    genTransition (location: 'prev' | 'next') {
      return this.$createElement(VFadeTransition, [this.genIcon(location)])
    },
    genWrapper (): VNode {
      return this.$createElement('div', {
        staticClass: 'v-slide-group__wrapper',
        directives: [{
          name: 'touch',
          value: {
            start: (e: TouchEvent) => this.overflowCheck(e, this.onTouchStart),
            move: (e: TouchEvent) => this.overflowCheck(e, this.onTouchMove),
            end: (e: TouchEvent) => this.overflowCheck(e, this.onTouchEnd)
          }
        }],
        ref: 'wrapper'
      }, [this.genContent()])
    },
    newOffset /* istanbul ignore next */ (direction: 'prev' | 'next') {
      // Force reflow
      const clientWidth = this.$refs.wrapper.clientWidth

      if (direction === 'prev') {
        return Math.max(this.scrollOffset - clientWidth, 0)
      }

      const min = Math.min(
        this.scrollOffset + clientWidth,
        this.$refs.content.clientWidth - clientWidth
      )

      return this.$vuetify.rtl ? -min : min
    },
    onAffixClick (location: 'prev' | 'next') {
      this.$emit(`click:${location}`)
      this.scrollTo(location)
    },
    onResize () {
      /* istanbul ignore next */
      if (this._isDestroyed) return

      this.setWidths()
    },
    onTouchStart (e: TouchEvent) {
      const { content } = this.$refs

      this.startX = this.scrollOffset + e.touchstartX as number

      content.style.setProperty('transition', 'none')
      content.style.setProperty('willChange', 'transform')
    },
    onTouchMove (e: TouchEvent) {
      this.scrollOffset = this.startX - e.touchmoveX
    },
    onTouchEnd () {
      const { content, wrapper } = this.$refs
      const maxScrollOffset = content.clientWidth - wrapper.clientWidth

      content.style.setProperty('transition', null)
      content.style.setProperty('willChange', null)

      /* istanbul ignore else */
      if (this.scrollOffset < 0 || !this.isOverflowing) {
        this.scrollOffset = 0
      } else if (this.scrollOffset >= maxScrollOffset) {
        this.scrollOffset = maxScrollOffset
      }
    },
    overflowCheck (e: TouchEvent, fn: (e: TouchEvent) => void) {
      this.isOverflowing && fn(e)
    },
    scrollIntoView () {
      /* istanbul ignore next */
      if (!this.selectedItem) return
      if (!this.isOverflowing) {
        (this.scrollOffset = 0)
        return
      }

      const totalWidth = this.widths.wrapper + this.scrollOffset
      const { clientWidth, offsetLeft } = this.selectedItem.$el as HTMLElement
      const itemOffset = clientWidth + offsetLeft
      let additionalOffset = clientWidth * 0.3

      if (this.selectedItem === this.items[this.items.length - 1]) {
        additionalOffset = 0 // don't add an offset if selecting the last tab
      }

      /* istanbul ignore else */
      if (offsetLeft < this.scrollOffset) {
        this.scrollOffset = Math.max(offsetLeft - additionalOffset, 0)
      } else if (totalWidth < itemOffset) {
        this.scrollOffset -= totalWidth - itemOffset - additionalOffset
      }
    },
    scrollTo /* istanbul ignore next */ (location: 'prev' | 'next') {
      this.scrollOffset = this.newOffset(location)
    },
    setOverflow () {
      this.isOverflowing = this.widths.wrapper < this.widths.content
    },
    setWidths () {
      window.requestAnimationFrame(() => {
        const { content, wrapper } = this.$refs

        this.widths = {
          content: content ? content.clientWidth : 0,
          wrapper: wrapper ? wrapper.clientWidth : 0
        }

        this.setOverflow()
        this.scrollIntoView()
      })
    }
  },

  render (h): VNode {
    return h('div', this.genData(), [
      this.genPrev(),
      this.genWrapper(),
      this.genNext()
    ])
  }
})

export default BaseSlideGroup.extend({
  name: 'v-slide-group',

  provide (): object {
    return {
      slideGroup: this
    }
  }
})