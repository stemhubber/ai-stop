import { useEffect, useRef } from "react";
import { useHelp } from "./HelpContext";

export default function HelpTrigger({ help, children }) {
  const { registerHelp } = useHelp();
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      // Register tooltip on mount
      registerHelp({ ...help, element: ref.current });
    }
  }, [help, registerHelp]);

  return (
    <span ref={ref} style={{ display: "inline-flex" }}>
      {children}
    </span>
  );
}
