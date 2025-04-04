import { Transition } from "@headlessui/react";
import cn from "clsx";
import { useRouter } from "next/router";
import { useMounted } from "nextra/hooks";
import { InformationCircleIcon, SpinnerIcon } from "nextra/icons";
import type {
  ReactNode,
  CompositionEvent,
  KeyboardEvent,
  ReactElement,
} from "react";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
} from "react";
import { Input } from "./input";
import Link from "next/link";
import * as aa from "search-insights";
import AlgoliaContext from "@/utils/contexts/AlgoliaContext";

type SearchResult = {
  children: ReactNode;
  id: string;
  prefix?: ReactNode;
  route: string;
};

type SearchProps = {
  className?: string;
  overlayClassName?: string;
  value: string;
  onChange: (newValue: string) => void;
  onActive?: (active: boolean) => void;
  loading?: boolean;
  error?: boolean;
  results: SearchResult[];
};

const INPUTS = ["input", "select", "button", "textarea"];

export function DocSearch({
  className,
  overlayClassName,
  value,
  onChange,
  onActive,
  loading,
  error,
  results,
}: SearchProps): ReactElement {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const ulRef = useRef<HTMLUListElement>(null);
  const [focused, setFocused] = useState(false);
  //  Trigger the search after the Input is complete for languages like Chinese
  const [composition, setComposition] = useState(true);
  const { queryID, setObjectID } = useContext(AlgoliaContext);

  useEffect(() => {
    setActive(0);
  }, [value]);

  useEffect(() => {
    const down = (e: globalThis.KeyboardEvent): void => {
      const activeElement = document.activeElement as HTMLElement;
      const tagName = activeElement?.tagName.toLowerCase();
      if (
        !input.current ||
        !tagName ||
        INPUTS.includes(tagName) ||
        activeElement?.isContentEditable
      )
        return;
      if (
        e.key === "/" ||
        (e.key === "k" &&
          (e.metaKey /* for Mac */ || /* for non-Mac */ e.ctrlKey))
      ) {
        e.preventDefault();
        // prevent scrolling to the top
        input.current.focus({ preventScroll: true });
      } else if (e.key === "Escape") {
        setShow(false);
        input.current.blur();
      }
    };

    window.addEventListener("keydown", down);
    return () => {
      window.removeEventListener("keydown", down);
    };
  }, []);

  const finishSearch = (i: number) => {
    input.current?.blur();

    const result = results[i];

    aa.default("clickedObjectIDsAfterSearch", {
      index: "docs",
      eventName: "Search Option Clicked",
      queryID: queryID,
      objectIDs: [result.id],
      positions: [results.indexOf(result) + 1],
    });

    setObjectID(result.id);
    onChange("");
    setShow(false);
  };

  const handleActive = useCallback(
    (e: { currentTarget: { dataset: DOMStringMap } }) => {
      const { index } = e.currentTarget.dataset;
      setActive(Number(index));
    },
    []
  );

  const handleKeyDown = useCallback(
    function <T>(e: KeyboardEvent<T>) {
      switch (e.key) {
        case "ArrowDown": {
          if (active + 1 < results.length) {
            const el = ulRef.current?.querySelector<HTMLAnchorElement>(
              `li:nth-of-type(${active + 2}) > a`
            );
            if (el) {
              e.preventDefault();
              handleActive({ currentTarget: el });
              el.focus();
            }
          }
          break;
        }
        case "ArrowUp": {
          if (active - 1 >= 0) {
            const el = ulRef.current?.querySelector<HTMLAnchorElement>(
              `li:nth-of-type(${active}) > a`
            );
            if (el) {
              e.preventDefault();
              handleActive({ currentTarget: el });
              el.focus();
            }
          }
          break;
        }
        case "Enter": {
          const result = results[active];
          if (result && composition) {
            void router.push(result.route);
            finishSearch(active);
          }
          break;
        }
        case "Escape": {
          setShow(false);
          input.current?.blur();
          break;
        }
      }
    },
    [active, results, router, finishSearch, handleActive, composition]
  );

  const mounted = useMounted();
  const renderList = show && Boolean(value);

  const icon = (
    <Transition
      show={mounted && (!show || Boolean(value))}
      as={Fragment}
      enter="nx-transition-opacity"
      enterFrom="nx-opacity-0"
      enterTo="nx-opacity-100"
      leave="nx-transition-opacity"
      leaveFrom="nx-opacity-100"
      leaveTo="nx-opacity-0"
    >
      <kbd
        className={cn(
          "nx-absolute nx-my-1.5 nx-select-none ltr:nx-right-1.5 rtl:nx-left-1.5",
          "nx-h-5 nx-rounded nx-bg-white nx-px-1.5 nx-font-mono nx-text-[10px] nx-font-medium nx-text-gray-500",
          "nx-border dark:nx-border-gray-100/20 dark:nx-bg-dark/50",
          "contrast-more:nx-border-current contrast-more:nx-text-current contrast-more:dark:nx-border-current",
          "nx-items-center nx-gap-1 nx-transition-opacity",
          value
            ? "nx-z-20 nx-flex nx-cursor-pointer hover:nx-opacity-70"
            : "nx-pointer-events-none nx-hidden sm:nx-flex"
        )}
        title={value ? "Clear" : undefined}
        onClick={() => {
          onChange("");
        }}
      >
        {value && focused
          ? "ESC"
          : mounted &&
            (navigator.userAgent.includes("Macintosh") ? (
              <>
                <span className="nx-text-xs">⌘</span>K
              </>
            ) : (
              "CTRL K"
            ))}
      </kbd>
    </Transition>
  );
  const handleComposition = useCallback(
    (e: CompositionEvent<HTMLInputElement>) => {
      setComposition(e.type === "compositionend");
    },
    []
  );

  return (
    <div className={cn("nextra-search nx-relative md:nx-w-64", className)}>
      {renderList && (
        <div
          className="nx-fixed nx-inset-0 nx-z-10"
          onClick={() => setShow(false)}
        />
      )}

      <Input
        ref={input}
        value={value}
        onChange={(e) => {
          const { value } = e.target;
          onChange(value);
          setShow(Boolean(value));
        }}
        onFocus={() => {
          onActive?.(true);
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        onCompositionStart={handleComposition}
        onCompositionEnd={handleComposition}
        type="search"
        placeholder={"Search"}
        onKeyDown={handleKeyDown}
        suffix={icon}
      />

      <Transition
        show={renderList}
        // Transition.Child is required here, otherwise popup will be still present in DOM after focus out
        as={Transition.Child}
        leave="nx-transition-opacity nx-duration-100"
        leaveFrom="nx-opacity-100"
        leaveTo="nx-opacity-0"
      >
        <div
          className={cn(
            "nx-absolute nx-top-full nx-z-20 nx-mt-2 nx-inset-x-0 ltr:md:nx-left-auto rtl:md:nx-right-auto",
            overlayClassName
          )}
        >
          <ul
            className={cn(
              "nextra-scrollbar",
              // Using bg-white as background-color when the browser didn't support backdrop-filter
              "nx-border nx-border-gray-200 nx-bg-white nx-text-gray-100 dark:nx-border-neutral-800 dark:nx-bg-neutral-900",
              "nx-overflow-auto nx-overscroll-contain nx-rounded-xl nx-py-2.5 nx-shadow-xl",
              "nx-max-h-[min(calc(50vh-11rem-env(safe-area-inset-bottom)),400px)]",
              "md:nx-max-h-[min(calc(100vh-5rem-env(safe-area-inset-bottom)),400px)]",
              " ",
              "contrast-more:nx-border contrast-more:nx-border-gray-900 contrast-more:dark:nx-border-gray-50"
            )}
            ref={ulRef}
            style={{
              transition: "max-height .2s ease", // don't work with tailwindcss
            }}
          >
            {error ? (
              <span className="nx-flex nx-select-none nx-justify-center nx-gap-2 nx-p-8 nx-text-center nx-text-sm nx-text-red-500">
                <InformationCircleIcon className="nx-h-5 nx-w-5" />
                {"Error"}
              </span>
            ) : loading ? (
              <span className="nx-flex nx-select-none nx-justify-center nx-gap-2 nx-p-8 nx-text-center nx-text-sm nx-text-gray-400">
                <SpinnerIcon className="nx-h-5 nx-w-5 nx-animate-spin" />
                {"Loading"}
              </span>
            ) : results.length > 0 ? (
              results.map(({ route, prefix, children, id }, i) => (
                <Fragment key={id}>
                  {prefix}
                  <li
                    className={cn(
                      "nx-mx-2.5 nx-break-words nx-rounded-md",
                      "contrast-more:nx-border",
                      i === active
                        ? "nx-bg-primary-500/10 nx-text-primary-600 contrast-more:nx-border-primary-500"
                        : "nx-text-gray-800 contrast-more:nx-border-transparent dark:nx-text-gray-300"
                    )}
                  >
                    <Link
                      className="nx-block nx-scroll-m-12 nx-px-2.5 nx-py-2"
                      href={route}
                      data-index={i}
                      onFocus={handleActive}
                      onMouseMove={handleActive}
                      onClick={() => finishSearch(i)}
                      onKeyDown={handleKeyDown}
                    >
                      {children}
                    </Link>
                  </li>
                </Fragment>
              ))
            ) : (
              <span className="nx-block nx-select-none nx-p-8 nx-text-center nx-text-sm nx-text-gray-400">
                No results found.
              </span>
            )}
          </ul>
          <div
            className="nx-absolute nx-px-2 nx-py-2 nx-bg-white dark:nx-bg-dark/50"
            style={{
              top: "1px",
              right: "1px",
              borderBottomLeftRadius: "0.5rem",
              borderTopRightRadius: "0.5rem",
            }}
          >
            <img
              src="/logos/algolia-logo-blue.png"
              style={{ width: "60px" }}
              alt="Algolia logo"
            />
          </div>
        </div>
      </Transition>
    </div>
  );
}
