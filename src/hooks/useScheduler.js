// hooks/useScheduler.js
import { useEffect } from "react";
import { FollowUpController } from "../controllers/FollowUpController";

export const useScheduler = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      FollowUpController.runScheduler();
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, []);
};
