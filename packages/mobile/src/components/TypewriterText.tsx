import React, { useEffect, useCallback } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fonts } from '../lib/theme';

const PHRASES = [
  'validate your ideas in seconds',
  'capture ideas with your voice',
  'deep market research, instantly',
  'find your unfair advantage',
  'turn hunches into business plans',
  'know your competition cold',
];

const TYPING_SPEED = 45;
const DELETE_SPEED = 25;
const PAUSE_AFTER_TYPE = 2200;
const PAUSE_AFTER_DELETE = 400;

export function TypewriterText() {
  const [displayText, setDisplayText] = React.useState('');
  const [phraseIndex, setPhraseIndex] = React.useState(0);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400, easing: Easing.steps(1) }),
        withTiming(1, { duration: 400, easing: Easing.steps(1) })
      ),
      -1,
      false
    );
  }, []);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const typePhrase = useCallback((phrase: string, charIndex: number, nextPhraseIdx: number) => {
    if (charIndex <= phrase.length) {
      setDisplayText(phrase.slice(0, charIndex));
      setTimeout(() => typePhrase(phrase, charIndex + 1, nextPhraseIdx), TYPING_SPEED);
    } else {
      setTimeout(() => deletePhrase(phrase, phrase.length, nextPhraseIdx), PAUSE_AFTER_TYPE);
    }
  }, []);

  const deletePhrase = useCallback((phrase: string, charIndex: number, nextPhraseIdx: number) => {
    if (charIndex >= 0) {
      setDisplayText(phrase.slice(0, charIndex));
      setTimeout(() => deletePhrase(phrase, charIndex - 1, nextPhraseIdx), DELETE_SPEED);
    } else {
      setPhraseIndex(nextPhraseIdx);
      setTimeout(() => {
        typePhrase(PHRASES[nextPhraseIdx], 0, (nextPhraseIdx + 1) % PHRASES.length);
      }, PAUSE_AFTER_DELETE);
    }
  }, [typePhrase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      typePhrase(PHRASES[0], 0, 1);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {displayText}
        <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 28,
    justifyContent: 'center',
  },
  text: {
    ...fonts.mono.regular,
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  cursor: {
    ...fonts.mono.regular,
    fontSize: 16,
    color: colors.brand,
  },
});
