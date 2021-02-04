import { inject, defineComponent, PropType, computed, provide } from 'vue';
import PropTypes from '../_util/vue-types';
import { filterEmpty } from '../_util/props-util';
import { defaultConfigProvider, SizeType } from '../config-provider';
import { tuple, withInstall } from '../_util/type';
import Item from './Item';

type SpaceSize = number | SizeType;

export type SpaceContext = {
  latestIndex: number;
  horizontalSize: number;
  verticalSize: number;
};

const spaceSize = {
  small: 8,
  middle: 16,
  large: 24,
};

function getNumberSize(size: SpaceSize) {
  return typeof size === 'string' ? spaceSize[size] : size || 0;
}

const Space = defineComponent({
  name: 'ASpace',
  props: {
    prefixCls: PropTypes.string,
    size: {
      type: [String, Number] as PropType<SpaceSize>,
    },
    direction: PropTypes.oneOf(tuple('horizontal', 'vertical')),
    align: PropTypes.oneOf(tuple('start', 'end', 'center', 'baseline')),
    split: PropTypes.VNodeChild,
    wrap: PropTypes.looseBool,
  },
  setup(props, { slots }) {
    const configProvider = inject('configProvider', defaultConfigProvider);

    return () => {
      const {
        align,
        size = 'small',
        direction = 'horizontal',
        split,
        wrap = false,
        prefixCls: customizePrefixCls,
      } = props;

      const { getPrefixCls } = configProvider;
      const prefixCls = getPrefixCls('space', customizePrefixCls);

      const sizes = computed(() =>
        ((Array.isArray(size) ? size : [size, size]) as [SpaceSize, SpaceSize]).map(item =>
          getNumberSize(item),
        ),
      );

      const items = filterEmpty(slots.default?.());
      const len = items.length;

      if (len === 0) {
        return null;
      }

      const mergedAlign = align === undefined && direction === 'horizontal' ? 'center' : align;

      const someSpaceClass = {
        [prefixCls]: true,
        [`${prefixCls}-${direction}`]: true,
        [`${prefixCls}-align-${mergedAlign}`]: mergedAlign,
      };

      const itemClassName = `${prefixCls}-item`;
      const marginDirection = 'marginRight'; // directionConfig === 'rtl' ? 'marginLeft' : 'marginRight';

      // Calculate latest one
      let latestIndex = 0;
      const nodes = items.map((child, i) => {
        if (child !== null && child !== undefined) {
          latestIndex = i;
        }

        return (
          <Item
            prefixCls={itemClassName}
            key={`${itemClassName}-${i}`}
            direction={direction}
            index={i}
            marginDirection={marginDirection}
            split={split}
            wrap={wrap}
          >
            {child}
          </Item>
        );
      });

      provide<SpaceContext>('spaceContext', {
        horizontalSize: sizes.value[0],
        verticalSize: sizes.value[1],
        latestIndex,
      });

      return (
        <div
          class={someSpaceClass}
          style={{
            ...(wrap && { flexWrap: 'wrap', marginBottom: `-${sizes.value[1]}px` }),
          }}
        >
          {nodes}
        </div>
      );
    };
  },
});

export default withInstall(Space);
