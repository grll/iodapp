import { useEffect } from "react";

export function Test() {

  useEffect(() => {
    const unlisten = window.installer.onInstallError((error) => {
      console.log(error);
    });

    return () => {
      unlisten();
    };
  }, []);

  useEffect(() => {
    const unlisten = window.installer.onInstallSuccess((message) => {
      console.log(message);
    });

    return () => {
      unlisten();
    };
  }, []);

  return <h2>Hello from React Again!</h2>;
}
