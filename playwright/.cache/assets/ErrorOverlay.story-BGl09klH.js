import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import { ErrorOverlay } from './ErrorOverlay-7KUcZWh9.js';
import './index-BAe1oPKr.js';

function ErrorWrapper({
  name,
  message,
  source,
  componentStack
}) {
  const error = new Error(message);
  if (name) error.name = name;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ErrorOverlay,
    {
      error,
      source,
      componentStack
    }
  );
}

export { ErrorWrapper };
//# sourceMappingURL=ErrorOverlay.story-BGl09klH.js.map
