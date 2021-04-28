import {
  defineComponent,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  reactive,
  ref,
  getCurrentInstance,
} from 'vue';
import PropTypes from '../_util/vue-types';
import classNames from '../_util/classNames';
import addEventListener from '../vc-util/Dom/addEventListener';
import Affix from '../affix';
import scrollTo from '../_util/scrollTo';
import getScroll from '../_util/getScroll';
import { defaultConfigProvider } from '../config-provider';

function getDefaultContainer() {
  return window;
}

function getOffsetTop(element: HTMLElement, container: AnchorContainer): number {
  if (!element) {
    return 0;
  }

  if (!element.getClientRects().length) {
    return 0;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width || rect.height) {
    if (container === window) {
      container = element.ownerDocument.documentElement;
      return rect.top - container.clientTop;
    }
    return rect.top - (container as HTMLElement).getBoundingClientRect().top;
  }

  return rect.top;
}

const sharpMatcherRegx = /#([^#]+)$/;

type Section = {
  link: string;
  top: number;
};

export type AnchorContainer = HTMLElement | Window;

const AnchorProps = {
  prefixCls: PropTypes.string,
  offsetTop: PropTypes.number,
  bounds: PropTypes.number,
  affix: PropTypes.looseBool.def(true),
  showInkInFixed: PropTypes.looseBool.def(false),
  getContainer: PropTypes.func.def(getDefaultContainer),
  wrapperClass: PropTypes.string,
  wrapperStyle: PropTypes.style,
  getCurrentAnchor: PropTypes.func,
  targetOffset: PropTypes.number,
  onChange: PropTypes.func,
  onClick: PropTypes.func,
};

export interface AntAnchor {
  registerLink: (link: string) => void;
  unregisterLink: (link: string) => void;
  $data: AnchorState;
  scrollTo: (link: string) => void;
  $emit?: Function;
}
export interface AnchorState {
  activeLink: null | string;
  scrollContainer: HTMLElement | Window;
  links: string[];
  scrollEvent: any;
  animating: boolean;
  sPrefixCls?: string;
}

export default defineComponent({
  name: 'AAnchor',
  inheritAttrs: false,
  props: AnchorProps,
  expose: ['handleScroll', 'handleScrollTo'],
  emits: ['change', 'click'],
  setup(props, { emit, attrs, slots, expose }) {
    const configProvider = inject('configProvider', defaultConfigProvider);
    const instance = getCurrentInstance();
    const inkNodeRef = ref();
    const anchorRef = ref();
    const data = reactive<AnchorState>({
      activeLink: null,
      links: [],
      sPrefixCls: '',
      scrollContainer: null,
      scrollEvent: null,
      animating: false,
    });

    // func...
    const getCurrentActiveLink = (offsetTop = 0, bounds = 5) => {
      const { getCurrentAnchor } = props;

      if (typeof getCurrentAnchor === 'function') {
        return getCurrentAnchor();
      }
      const activeLink = '';
      if (typeof document === 'undefined') {
        return activeLink;
      }

      const linkSections: Array<Section> = [];
      const { getContainer } = props;
      const container = getContainer();
      data.links.forEach(link => {
        const sharpLinkMatch = sharpMatcherRegx.exec(link.toString());
        if (!sharpLinkMatch) {
          return;
        }
        const target = document.getElementById(sharpLinkMatch[1]);
        if (target) {
          const top = getOffsetTop(target, container);
          if (top < offsetTop + bounds) {
            linkSections.push({
              link,
              top,
            });
          }
        }
      });

      if (linkSections.length) {
        const maxSection = linkSections.reduce((prev, curr) => (curr.top > prev.top ? curr : prev));
        return maxSection.link;
      }
      return '';
    };
    const setCurrentActiveLink = (link: string) => {
      const { activeLink } = data;
      if (activeLink !== link) {
        data.activeLink = link;
        emit('change', link);
      }
    };
    const handleScrollTo = (link: string) => {
      const { offsetTop, getContainer, targetOffset } = props;

      setCurrentActiveLink(link);
      const container = getContainer();
      const scrollTop = getScroll(container, true);
      const sharpLinkMatch = sharpMatcherRegx.exec(link);
      if (!sharpLinkMatch) {
        return;
      }
      const targetElement = document.getElementById(sharpLinkMatch[1]);
      if (!targetElement) {
        return;
      }

      const eleOffsetTop = getOffsetTop(targetElement, container);
      let y = scrollTop + eleOffsetTop;
      y -= targetOffset !== undefined ? targetOffset : offsetTop || 0;
      data.animating = true;

      scrollTo(y, {
        callback: () => {
          data.animating = false;
        },
        getContainer,
      });
    };
    const handleScroll = () => {
      if (data.animating) {
        return;
      }
      const { offsetTop, bounds, targetOffset } = props;
      const currentActiveLink = getCurrentActiveLink(
        targetOffset !== undefined ? targetOffset : offsetTop || 0,
        bounds,
      );
      setCurrentActiveLink(currentActiveLink);
    };

    const updateInk = () => {
      if (typeof document === 'undefined') {
        return;
      }
      const { sPrefixCls } = data;
      const linkNode = anchorRef.value.getElementsByClassName(`${sPrefixCls}-link-title-active`)[0];
      if (linkNode) {
        (inkNodeRef.value as HTMLElement).style.top = `${linkNode.offsetTop +
          linkNode.clientHeight / 2 -
          4.5}px`;
      }
    };

    // provide data
    provide('antAnchor', {
      registerLink: (link: string) => {
        if (!data.links.includes(link)) {
          data.links.push(link);
        }
      },
      unregisterLink: (link: string) => {
        const index = data.links.indexOf(link);
        if (index !== -1) {
          data.links.splice(index, 1);
        }
      },
      $data: data,
      scrollTo: handleScrollTo,
    } as AntAnchor);
    provide('antAnchorContext', instance);

    expose({
      handleScroll,
      handleScrollTo,
    });

    onMounted(() => {
      nextTick(() => {
        const { getContainer } = props;
        data.scrollContainer = getContainer();
        data.scrollEvent = addEventListener(data.scrollContainer, 'scroll', handleScroll);
        handleScroll();
      });
    });
    onBeforeUnmount(() => {
      if (data.scrollEvent) {
        data.scrollEvent.remove();
      }
    });
    onUpdated(() => {
      if (data.scrollEvent) {
        const { getContainer } = props;
        const currentContainer = getContainer();
        if (data.scrollContainer !== currentContainer) {
          data.scrollContainer = currentContainer;
          data.scrollEvent.remove();
          data.scrollEvent = addEventListener(data.scrollContainer, 'scroll', handleScroll);
          handleScroll();
        }
      }
      updateInk();
    });

    return () => {
      const {
        prefixCls: customizePrefixCls,
        offsetTop,
        affix,
        showInkInFixed,
        getContainer,
      } = props;
      const getPrefixCls = configProvider.getPrefixCls;
      const prefixCls = getPrefixCls('anchor', customizePrefixCls);
      data.sPrefixCls = prefixCls;

      const inkClass = classNames(`${prefixCls}-ink-ball`, {
        visible: data.activeLink,
      });

      const wrapperClass = classNames(props.wrapperClass, `${prefixCls}-wrapper`);

      const anchorClass = classNames(prefixCls, {
        fixed: !affix && !showInkInFixed,
      });

      const wrapperStyle = {
        maxHeight: offsetTop ? `calc(100vh - ${offsetTop}px)` : '100vh',
        ...props.wrapperStyle,
      };
      const anchorContent = (
        <div class={wrapperClass} style={wrapperStyle} ref={anchorRef}>
          <div class={anchorClass}>
            <div class={`${prefixCls}-ink`}>
              <span class={inkClass} ref={inkNodeRef} />
            </div>
            {slots.default?.()}
          </div>
        </div>
      );

      return !affix ? (
        anchorContent
      ) : (
        <Affix {...attrs} offsetTop={offsetTop} target={getContainer}>
          {anchorContent}
        </Affix>
      );
    };
  },
});
