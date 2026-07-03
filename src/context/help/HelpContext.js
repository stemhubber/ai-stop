import { createContext, useCallback, useContext, useState } from "react";

const HelpContext = createContext();

export const HelpProvider = ({ children }) => {
  const [queue, setQueue] = useState([]); // all tooltips
  const [activeIndex, setActiveIndex] = useState(0);

  // Add single tooltip or multiple, append instead of replacing
  const registerHelp = useCallback((help) => {
    setQueue((prev) => {
      const id = help.id || `help-${prev.length}-${Math.random().toString(36).substr(2, 5)}`;
      if (prev.find((item)=> item?.text === help?.text)){
        return prev;
      }
      return [...prev, { ...help, id }];
    });

    
  }, []);

  const nextHelp = () => {
    setActiveIndex((prev) => {
      if (prev + 1 < queue.length)
        return prev+1;
      else 
        endHelp();
        return -1;
    });
  };

  const prevHelp = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const endHelp = () => {
    setQueue([]);
    setActiveIndex(0);
  };

  const activeHelp = activeIndex === -1 || activeIndex >= queue.length? null : queue[activeIndex];

  return (
    <HelpContext.Provider
      value={{ queue, activeIndex, activeHelp, registerHelp, nextHelp, prevHelp, endHelp }}
    >
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => useContext(HelpContext);
