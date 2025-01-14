import {
  defineComponent,
  resolveComponent,
  computed,
  ComputedRef,
  VNodeChild,
  VNode,
  PropType,
  isVNode,
  ExtractPropTypes,
  ConcreteComponent,
} from 'vue';
import { createFromIconfontCN } from '@ant-design/icons-vue';
import 'ant-design-vue/es/menu/style';
import Menu from 'ant-design-vue/es/menu';
import { defaultSettingProps, defaultSettings } from '../defaultSettings';
import { isImg, isUrl } from '../utils';
import { MenuMode } from './typings';
import {
  MenuDataItem,
  MenuTheme,
  FormatMessage,
  CustomRender,
  LayoutType,
  WithFalse,
} from '../typings';
import './index.less';

export function useRootSubmenuKeys(menus: MenuDataItem[]): ComputedRef<string[]> {
  return computed(() => menus.map(it => it.path));
}

export interface CustomMenuRender {
  menuItemRender?: WithFalse<
    (args: { item: MenuDataItem; title?: JSX.Element; icon?: JSX.Element }) => CustomRender
  >;
  subMenuItemRender?: WithFalse<
    (args: { item: MenuDataItem; children?: CustomRender[] }) => CustomRender
  >;
}

// vue props
export const baseMenuProps = {
  ...defaultSettingProps,
  prefixCls: {
    type: String as PropType<string | undefined>,
    default: () => 'ant-pro',
  },
  locale: {
    type: [Function, Boolean] as PropType<WithFalse<FormatMessage>>,
    default: (t: string): string => t,
  },
  menuData: {
    type: Array as PropType<MenuDataItem[]>,
    default: () => [],
  },
  // top-nav-header: horizontal
  mode: {
    type: String as PropType<MenuMode>,
    default: 'inline',
  },
  theme: {
    type: String as PropType<MenuTheme | 'realDark'>,
    default: 'dark',
  },
  layout: {
    type: String as PropType<LayoutType>,
    default: 'side',
  },
  collapsed: {
    type: Boolean as PropType<boolean | undefined>,
    default: () => false,
  },
  openKeys: {
    type: Array as PropType<WithFalse<string[]>>,
    default: () => undefined,
  },
  selectedKeys: {
    type: Array as PropType<WithFalse<string[]>>,
    default: () => undefined,
  },
  menuProps: {
    type: Object as PropType<Record<string, any>>,
    default: () => null,
  },
  menuItemRender: {
    type: [Function, Boolean] as PropType<CustomMenuRender['menuItemRender']>,
    default: () => false,
  },
  subMenuItemRender: {
    type: [Function, Boolean] as PropType<CustomMenuRender['subMenuItemRender']>,
    default: () => false,
  },

  onClick: [Function, Object] as PropType<(...args: any) => void>,
};

export type BaseMenuProps = ExtractPropTypes<typeof baseMenuProps>;

const IconFont = createFromIconfontCN({
  scriptUrl: defaultSettings.iconfontUrl,
});

const LazyIcon = (props: {
  icon: VNodeChild | string;
  iconPrefixes?: string;
  prefixCls?: string;
}) => {
  const { icon, iconPrefixes = 'icon-', prefixCls = 'ant-pro' } = props;
  if (!icon) {
    return null;
  }
  if (typeof icon === 'string' && icon !== '') {
    if (isUrl(icon) || isImg(icon)) {
      return <img src={icon} alt="icon" class={`${prefixCls}-sider-menu-icon`} />;
    }
    if (icon.startsWith(iconPrefixes)) {
      return <IconFont type={icon} />;
    }
  }
  if (isVNode(icon)) {
    return icon;
  }
  const DynamicIcon = resolveComponent(icon as string) as any;
  return (typeof LazyIcon === 'function' && <DynamicIcon />) || null;
};

LazyIcon.props = {
  icon: {
    type: [String, Function, Object] as PropType<string | Function | VNode | JSX.Element>,
  },
  iconPrefixes: String,
  prefixCls: String,
};

class MenuUtil {
  props: BaseMenuProps;
  RouterLink: ConcreteComponent;

  constructor(props: BaseMenuProps) {
    this.props = props;

    this.RouterLink = resolveComponent('router-link') as ConcreteComponent;
  }

  getNavMenuItems = (menusData: MenuDataItem[] = []) => {
    return menusData.map(item => this.getSubMenuOrItem(item)).filter(item => item);
  };

  getSubMenuOrItem = (item: MenuDataItem): VNode => {
    if (
      Array.isArray(item.children) &&
      item.children.length > 0 &&
      !item?.meta?.hideInMenu &&
      !item?.meta?.hideChildrenInMenu
    ) {
      if (this.props.subMenuItemRender) {
        return this.props.subMenuItemRender({
          item,
          children: this.getNavMenuItems(item.children),
        }) as VNode;
      }
      const { prefixCls, locale } = this.props;
      const menuTitle = (locale && locale(item.meta?.title)) || item.meta?.title;
      const defaultTitle = item.meta?.icon ? (
        <span class={`${prefixCls}-menu-item`}>
          <span class={`${prefixCls}-menu-item-title`}>{menuTitle}</span>
        </span>
      ) : (
        <span class={`${prefixCls}-menu-item`}>{menuTitle}</span>
      );

      const hasGroup = item.meta?.type === 'group';

      const MenuComponent = hasGroup ? Menu.ItemGroup : Menu.SubMenu;
      return (
        <MenuComponent
          title={defaultTitle}
          key={item.path}
          icon={hasGroup ? null : <LazyIcon icon={item.meta?.icon} />}
        >
          {this.getNavMenuItems(item.children)}
        </MenuComponent>
      );
    }

    const [title, icon] = this.getMenuItem(item);

    return (
      ((this.props.menuItemRender &&
        this.props.menuItemRender({ item, title, icon })) as VNode) || (
        <Menu.Item
          disabled={item.meta?.disabled}
          danger={item.meta?.danger}
          key={item.path}
          icon={icon}
        >
          {title}
        </Menu.Item>
      )
    );
  };

  getMenuItem = (item: MenuDataItem) => {
    const meta = { ...item.meta };
    const target = (meta.target || null) as string | null;
    const hasUrl = isUrl(item.path);
    const CustomTag: any = (target && 'a') || this.RouterLink;
    const props = { to: { name: item.name } };
    const attrs = hasUrl || target ? { ...item.meta, href: item.path, target } : {};

    const { prefixCls, locale } = this.props;
    const menuTitle = (locale && locale(item.meta?.title)) || item.meta?.title;
    const defaultTitle = item.meta?.icon ? (
      <CustomTag {...attrs} {...props} class={`${prefixCls}-menu-item`}>
        <span class={`${prefixCls}-menu-item-title`}>{menuTitle}</span>
      </CustomTag>
    ) : (
      <CustomTag {...attrs} {...props} class={`${prefixCls}-menu-item`}>
        <span>{menuTitle}</span>
      </CustomTag>
    );

    const icon = (item.meta?.icon && <LazyIcon icon={item.meta.icon} />) || undefined;

    return [defaultTitle, icon];
  };

  conversionPath = (path: string) => {
    if (path && path.indexOf('http') === 0) {
      return path;
    }
    return `/${path || ''}`.replace(/\/+/g, '/');
  };
}

export default defineComponent({
  name: 'BaseMenu',
  props: baseMenuProps,
  emits: ['update:openKeys', 'update:selectedKeys', 'click'],
  setup(props, { emit }) {
    const menuUtil = new MenuUtil(props);

    const handleOpenChange = (openKeys: string[]): void => {
      emit('update:openKeys', openKeys);
    };
    const handleSelect = (params: {
      key: string | number;
      keyPath: string[] | number[];
      item: VNodeChild | any;
      domEvent: MouseEvent;
      selectedKeys: string[];
    }): void => {
      emit('update:selectedKeys', params.selectedKeys);
    };
    const handleClick = (args: {
      item: VNodeChild;
      key: string | number;
      keyPath: string | string[] | number | number[];
    }) => {
      emit('click', args);
    };
    return () => (
      <Menu
        key="Menu"
        // inlineCollapsed={(isInline.value && props.collapsed) || undefined}
        inlineIndent={16}
        mode={props.mode}
        theme={props.theme as 'dark' | 'light'}
        openKeys={props.openKeys === false ? [] : props.openKeys}
        selectedKeys={props.selectedKeys || []}
        // @ts-ignore
        onOpenChange={handleOpenChange}
        onSelect={handleSelect}
        onClick={handleClick}
        {...props.menuProps}
      >
        {menuUtil.getNavMenuItems(props.menuData)}
      </Menu>
    );
  },
});
