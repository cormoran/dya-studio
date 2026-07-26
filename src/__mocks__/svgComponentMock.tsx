/**
 * Jest stub for `*.svg?react` imports.
 *
 * vite-plugin-svgr turns those into React components, so the plain string stub
 * used for other assets ({@link ./fileMock.ts}) is not enough — React would try
 * to render a string as a component type.
 */
import type { SVGProps } from "react";

export default function SvgMock(props: SVGProps<SVGSVGElement>) {
  return <svg data-testid="svg-mock" {...props} />;
}
