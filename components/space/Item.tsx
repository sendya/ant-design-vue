import { computed, CSSProperties, FunctionalComponent, inject, toRefs } from 'vue';
import { filterEmpty } from '../_util/props-util';
import { VueNode } from '../_util/type';
import { SpaceContext } from '.';

export interface ItemProps {
  prefixCls: string;
  index: number;
  direction?: 'horizontal' | 'vertical';
  marginDirection: 'marginLeft' | 'marginRight';
  split?: string | VueNode;
  wrap?: boolean;
}

const Item: FunctionalComponent<ItemProps> = (
  { prefixCls, direction, index, marginDirection, split, wrap },
  { slots },
) => {
  const { horizontalSize, verticalSize, latestIndex } = toRefs(
    inject<SpaceContext>('spaceContext'),
  );
  const style = computed<CSSProperties>(() => {
    let styles;
    if (direction === 'vertical') {
      if (index < latestIndex.value) {
        styles = { marginBottom: horizontalSize.value / (split ? 2 : 1) };
      }
    } else {
      styles = {
        ...(index < latestIndex.value && {
          [marginDirection]: horizontalSize.value / (split ? 2 : 1),
        }),
        ...(wrap && { paddingBottom: verticalSize }),
      };
    }
    return styles;
  });

  const child = filterEmpty(slots.default?.());
  if (child == null || child === undefined) {
    return null;
  }

  return (
    <>
      <div class={prefixCls} style={style.value}>
        {child}
      </div>
      {index < latestIndex.value && split && (
        <span class={`${prefixCls}-split`} style={style.value}>
          {split}
        </span>
      )}
    </>
  );
};

export default Item;
