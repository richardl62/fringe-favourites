import { useEffect, useState } from "react";

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, "");
}

/** The current URL hash (without the leading "#"), updated on navigation. */
export function useHashRoute(): string {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(currentRoute());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return route;
}
