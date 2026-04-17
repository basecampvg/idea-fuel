import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts } from '../../lib/theme';

export interface PopoverMenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  /** Overrides the default text + icon color. */
  color?: string;
  /** Applies destructive (red) styling. Overrides `color`. */
  destructive?: boolean;
  /** When true, renders a thin divider ABOVE this item. */
  divider?: boolean;
  onPress: () => void;
}

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PopoverProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Screen-coord position of the trigger. Usually set by the parent via
   * `ref.measureInWindow` in an onLayout callback — that way the position
   * is known before the user taps and there's no measurement-timing race.
   * If null, the popover falls back to a sensible top-right position so
   * the user always sees something when `visible` is true.
   */
  anchor: AnchorRect | null;
  /** Popover width in points. Default 240. */
  width?: number;
  /** Extra style applied to the popover container (e.g. padding). */
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Linear-style popover — anchored near its trigger, floats over content
 * instead of sliding up from the bottom. Generic container; use PopoverMenu
 * for a pre-built label-list menu.
 *
 * Design choices worth keeping:
 *   - Modal animationType="fade" is RN's built-in, robust across iOS/Android.
 *     Custom Animated.Value fades previously mixed native-driven opacity
 *     with a JS override that caused silent render failures.
 *   - Popover renders unconditionally when `visible`. If anchor measurement
 *     hasn't landed, a top-right fallback keeps the UI responsive instead
 *     of showing an empty modal.
 */
export function Popover({
  visible,
  onClose,
  anchor,
  width = 240,
  contentStyle,
  children,
}: PopoverProps) {
  const [popoverHeight, setPopoverHeight] = useState(0);
  const screen = Dimensions.get('window');
  const MARGIN = 8;
  const GAP = 8;

  // Fallback: near top-right of the screen, which is where triggers usually
  // sit in our app. Only used if `anchor` is null.
  const fallback: AnchorRect = {
    x: screen.width - 40,
    y: 80,
    width: 24,
    height: 24,
  };
  const pos = anchor ?? fallback;

  // Right-align to trigger, clamp to screen bounds with an 8pt margin.
  const left = Math.max(
    MARGIN,
    Math.min(
      pos.x + pos.width - width,
      screen.width - width - MARGIN,
    ),
  );
  // Drop below the trigger; flip above if there's no room (e.g. trigger
  // is near the bottom of the screen). popoverHeight===0 on first render
  // means we haven't measured yet — assume below and let the next render
  // correct if needed.
  const below = pos.y + pos.height + GAP;
  const fitsBelow =
    popoverHeight === 0 || below + popoverHeight <= screen.height - MARGIN;
  const top = fitsBelow
    ? below
    : Math.max(MARGIN, pos.y - popoverHeight - GAP);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner Pressable stops taps on the popover itself from closing it. */}
        <Pressable
          style={[styles.container, { width, left, top }, contentStyle]}
          onLayout={(e) => setPopoverHeight(e.nativeEvent.layout.height)}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface PopoverMenuProps {
  visible: boolean;
  onClose: () => void;
  anchor: AnchorRect | null;
  items: PopoverMenuItem[];
  /** Menu width in points. Default 240. */
  width?: number;
}

export function PopoverMenu({
  visible,
  onClose,
  anchor,
  items,
  width = 240,
}: PopoverMenuProps) {
  return (
    <Popover
      visible={visible}
      onClose={onClose}
      anchor={anchor}
      width={width}
      contentStyle={styles.menuPadding}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const color = item.destructive
          ? colors.destructive
          : item.color ?? colors.foreground;
        return (
          <React.Fragment key={item.key}>
            {item.divider && i > 0 ? <View style={styles.divider} /> : null}
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.6}
              onPress={() => {
                item.onPress();
                onClose();
              }}
            >
              {Icon ? <Icon size={18} color={color} /> : null}
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </Popover>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  menuPadding: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  label: {
    fontSize: 15,
    ...fonts.text.medium,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
    marginHorizontal: 10,
  },
});
