"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s / 100) * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function parseHSLToHex(hslString: string): string | null {
  const match = hslString.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*([\d.]+))?/);
  if (!match) {
    return null;
  }

  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);
  const alpha = match[4] ? parseFloat(match[4]) : 1;

  if (alpha < 0.5) {
    return null;
  }

  return hslToHex(h, s, l);
}

function parseRgbString(rgbString: string): string | null {
  const match = rgbString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) {
    return null;
  }
  return rgbToHex(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10));
}

function parseGradientFirstColor(gradient: string): string | null {
  if (!gradient) {
    return null;
  }

  const firstStopMatch = gradient.match(/linear-gradient\([^,]+,\s*([^,]+)(?:,|\))/i);
  const firstStop = firstStopMatch?.[1]?.trim();
  if (!firstStop) {
    return null;
  }

  const hexMatch = firstStop.match(/#([0-9a-f]{3,8})/i);
  if (hexMatch) {
    return hexMatch[0];
  }

  const rgbColor = parseRgbString(firstStop);
  if (rgbColor) {
    return rgbColor;
  }

  return parseHSLToHex(firstStop);
}

function getSolidStatusBarColor(): string {
  const htmlElement = document.documentElement;
  const computedStyle = getComputedStyle(htmlElement);
  const backgroundVar = computedStyle.getPropertyValue("--background").trim();

  if (backgroundVar.startsWith("#")) {
    return backgroundVar;
  }

  const parsedHsl = parseHSLToHex(backgroundVar);
  if (parsedHsl) {
    return parsedHsl;
  }

  const bodyBackgroundImage = document.body.style.backgroundImage || getComputedStyle(document.body).backgroundImage;
  const gradientColor = parseGradientFirstColor(bodyBackgroundImage);
  if (gradientColor) {
    return gradientColor;
  }

  const cardBackground = computedStyle.getPropertyValue("--card").trim();
  if (cardBackground.startsWith("#")) {
    return cardBackground;
  }

  return "#313338";
}

export function StatusBarHandler() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const updateThemeColor = () => {
      const themeColor = getSolidStatusBarColor();

      let metaTag = document.querySelector('meta[name="theme-color"]');
      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.setAttribute("name", "theme-color");
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute("content", themeColor);
    };

    updateThemeColor();

    const observer = new MutationObserver(() => {
      updateThemeColor();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    return () => observer.disconnect();
  }, [resolvedTheme]);

  return null;
}
