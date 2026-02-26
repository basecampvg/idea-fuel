import React from 'react';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  G,
} from 'react-native-svg';

interface Props {
  size?: number;
}

/**
 * Idea Fuel flame logo — converted from phone/ideafuellogo.svg
 *
 * The original SVG uses a conic-gradient via foreignObject (Figma export).
 * That isn't supported in react-native-svg, so the main flame body uses
 * a vertical linear gradient (#E32B1A → #DB4D40) as a close match.
 */
export function IdeaFuelLogo({ size = 120 }: Props) {
  // Original viewBox: 256 × 379 — scale proportionally
  const aspect = 379 / 256;
  const width = size;
  const height = size * aspect;

  return (
    <Svg width={width} height={height} viewBox="0 0 256 379" fill="none">
      <Defs>
        {/* Lower-left flame gradient */}
        <LinearGradient
          id="g0"
          x1="66.05"
          y1="335.07"
          x2="126.06"
          y2="335.07"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#C82617" />
          <Stop offset="0.8125" stopColor="#DB4D40" />
        </LinearGradient>

        {/* Upper-right flame gradient */}
        <LinearGradient
          id="g1"
          x1="167.19"
          y1="184.72"
          x2="229.37"
          y2="184.72"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.337" stopColor="#DB4D40" />
          <Stop offset="1" stopColor="#C32618" />
        </LinearGradient>

        {/* Main body gradient (approximation of conic gradient) */}
        <LinearGradient
          id="g2"
          x1="75"
          y1="0"
          x2="75"
          y2="370"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#E32B1A" />
          <Stop offset="1" stopColor="#DB4D40" />
        </LinearGradient>

        {/* Right flame gradient */}
        <LinearGradient
          id="g3"
          x1="143.89"
          y1="292.47"
          x2="255.07"
          y2="292.47"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.212" stopColor="#DB4D40" />
          <Stop offset="1" stopColor="#E32B1A" />
        </LinearGradient>

        {/* Clip for main body */}
        <ClipPath id="clip0">
          <Path d="M55.6348 267.371C47.352 281.966 42.3872 297.559 44.1087 316.644C46.4538 342.79 76.9407 368.412 76.9407 368.412C31.8341 348.753 0 303.696 0 251.355C0 221.516 11.3265 193.025 27.2685 168.202C43.0608 143.628 64.8906 123.869 79.5104 98.4711C95.9264 69.9552 104.858 34.9027 89.0905 4.09153C88.841 3.61751 87.2943 0 86.8701 0C125.54 28.1168 157.698 69.4063 151.262 119.752C145.125 167.927 103.012 203.504 74.7951 239.828C67.635 249.034 60.9488 257.991 55.6348 267.371Z" />
        </ClipPath>
      </Defs>

      {/* Lower-left piece */}
      <Path
        d="M44.311 281.743L126.067 269.693L76.9435 368.414C76.9435 368.414 61.6751 362.85 43.1135 343.316C24.5519 323.781 44.311 281.743 44.311 281.743Z"
        fill="url(#g0)"
      />

      {/* Upper-right piece */}
      <Path
        d="M135.19 231.575C135.19 231.575 189.103 156.705 165.028 92.8618C165.028 92.8618 187.731 110.875 219.266 150.792L229.37 203.009L213.079 220.048L135.19 231.55V231.575Z"
        fill="url(#g1)"
      />

      {/* Main flame body (linear gradient replacing conic) */}
      <G clipPath="url(#clip0)">
        <Path
          d="M55.6348 267.371C47.352 281.966 42.3872 297.559 44.1087 316.644C46.4538 342.79 76.9407 368.412 76.9407 368.412C31.8341 348.753 0 303.696 0 251.355C0 221.516 11.3265 193.025 27.2685 168.202C43.0608 143.628 64.8906 123.869 79.5104 98.4711C95.9264 69.9552 104.858 34.9027 89.0905 4.09153C88.841 3.61751 87.2943 0 86.8701 0C125.54 28.1168 157.698 69.4063 151.262 119.752C145.125 167.927 103.012 203.504 74.7951 239.828C67.635 249.034 60.9488 257.991 55.6348 267.371Z"
          fill="url(#g2)"
        />
      </G>

      {/* Right flame piece */}
      <Path
        d="M86.6677 372.204C94.9007 374.998 103.533 376.969 112.439 378.017C117.379 378.615 122.419 378.915 127.533 378.915C197.962 378.915 255.069 321.808 255.069 251.379C255.069 251.379 257.04 184.143 195.717 122.97C195.717 122.97 217.347 150.089 218.744 187.411C217.846 197.84 217.996 211.486 198.835 235.911C179.675 260.335 86.6677 372.229 86.6677 372.229V372.204Z"
        fill="url(#g3)"
      />
    </Svg>
  );
}
