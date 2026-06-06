import { useRef, useEffect, useCallback, useState } from 'react';
import { Animated, Easing } from 'react-native';

// ─── GSAP-inspired easing curves ───
// Adapted from GSAP's power1/2/3/4, back, elastic for React Native

export const Ease = {
  // power1.out = quadratic out
  power1Out: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  // power2.out = cubic out
  power2Out: Easing.bezier(0.215, 0.61, 0.355, 1),
  // power3.out = quart out
  power3Out: Easing.bezier(0.165, 0.84, 0.44, 1),
  // power4.out = quint out
  power4Out: Easing.bezier(0.23, 1, 0.32, 1),
  // back.out(1.7)
  backOut: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  // elastic feel with spring
};

// ─── Staggered entrance (like GSAP stagger) ───

/**
 * Creates an array of Animated values for staggered entrance.
 * Each item fades in + translates up, offset by staggerDelay.
 */
export function createStaggerValues(count: number) {
  const opacities = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  const translates = useRef(Array.from({ length: count }, () => new Animated.Value(30))).current;

  const animate = useCallback((staggerDelay: number = 80) => {
    const animations = opacities.map((op, i) =>
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 400,
          delay: i * staggerDelay,
          easing: Ease.power3Out,
          useNativeDriver: true,
        }),
        Animated.timing(translates[i], {
          toValue: 0,
          duration: 500,
          delay: i * staggerDelay,
          easing: Ease.backOut,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(staggerDelay, animations).start();
  }, [opacities, translates]);

  return { opacities, translates, animate };
}

// ─── Fade in from below (single item) ───

export function useFadeIn(delay: number = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Ease.power2Out,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Ease.power3Out,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, delay]);

  return { opacity, translateY };
}

// ─── Scale entrance (for buttons / action items) ───

export function useScaleIn(delay: number = 0) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        delay,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        easing: Ease.power2Out,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity, delay]);

  return { scale, opacity };
}

// ─── Collapsible height animation ───

export function useCollapsible(initialExpanded: boolean = true) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const animValue = useRef(new Animated.Value(initialExpanded ? 1 : 0)).current;

  const toggle = useCallback(() => {
    const newState = !expanded;
    setExpanded(newState);
    Animated.timing(animValue, {
      toValue: newState ? 1 : 0,
      duration: 300,
      easing: Ease.power3Out,
      useNativeDriver: false,
    }).start();
  }, [expanded, animValue]);

  return { animValue, toggle };
}

// ─── Press scale feedback (like GSAP quickTo) ───

export function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.95,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
}

// ─── GSAP.timeline-like sequence ───

export function createSequence() {
  const currentDelay = useRef(0);

  const add = useCallback((animation: Animated.CompositeAnimation, duration: number = 300) => {
    return Animated.sequence([
      Animated.delay(currentDelay.current),
      animation,
    ]);
  }, []);

  return { add };
}
