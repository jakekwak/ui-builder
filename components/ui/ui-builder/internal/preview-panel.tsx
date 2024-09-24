import React, {
  ReactNode,
  Suspense,
  useState,
  useEffect,
  cloneElement, 
  isValidElement, 
  useRef
} from "react";
import { ChevronRight, Plus, Trash, Copy } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import {
  componentRegistry,
  isTextLayer,
  Layer,
  useComponentStore,
} from "@/components/ui/ui-builder/internal/store/component-store";
import { Markdown } from "../markdown";
import { DividerControl } from "./divider-control";
import { AddComponentsPopover } from "./add-component-popover";

interface PreviewPanelProps {
  className?: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ className }) => {
  const {
    layers,
    selectLayer,
    addComponentLayer,
    selectedLayerId,
    findLayerById,
    duplicateLayer,
    removeLayer,
  } = useComponentStore();

  console.log("PreviewPanel", { selectedLayerId });
  const selectedLayer = findLayerById(selectedLayerId);

  const onAddElement = (
    componentName: keyof typeof componentRegistry,
    parentId?: string,
    parentPosition?: number
  ) => {
    addComponentLayer(componentName, parentId, parentPosition);
  };

  const onSelectElement = (layerId: string) => {
    console.log("onSelectElement", layerId);
    selectLayer(layerId);
  };

  const handleDeleteLayer = () => {
    if (selectedLayer) {
      removeLayer(selectedLayer.id);
    }
  };

  const handleDuplicateLayer = () => {
    if (selectedLayer) {
      duplicateLayer(selectedLayer.id);
    }
  };

  const renderLayer = (layer: Layer) => {
    if (isTextLayer(layer)) {
      const TextComponent = layer.textType === "markdown" ? Markdown : "span";

      return (
        <ClickableWrapper
          key={layer.id}
          layer={layer}
          isSelected={layer.id === selectedLayer?.id}
          onSelectElement={onSelectElement}
          onAddElement={onAddElement}
          onDuplicateLayer={handleDuplicateLayer}
          onDeleteLayer={handleDeleteLayer}
        >
          <TextComponent>
            {layer.text}
          </TextComponent>
        </ClickableWrapper>
      );
    }

    const { component: Component } =
      componentRegistry[layer.type as keyof typeof componentRegistry];
    if (!Component) return null;

    const childProps = { ...layer.props };
    if (layer.children && layer.children.length > 0) {
      childProps.children = layer.children.map(renderLayer);
    }

    return (
      <ClickableWrapper
        key={layer.id}
        layer={layer}
        isSelected={layer.id === selectedLayer?.id}
        onSelectElement={onSelectElement}
        onAddElement={onAddElement}
        onDuplicateLayer={handleDuplicateLayer}
        onDeleteLayer={handleDeleteLayer}
      >
        <Component {...(childProps as any)} />
      </ClickableWrapper>
    );
  };

  return (
    <div className={className}>
      <h2 className="text-xl font-semibold mb-4">Preview</h2>

      <div className="border p-4 relative w-full">
        <DividerControl
          handleAddComponent={(elem) => onAddElement(elem, undefined, 0)}
          availableComponents={
            Object.keys(componentRegistry) as Array<
              keyof typeof componentRegistry
            >
          }
        />
        <div className="flex flex-col w-full overflow-y-visible relative">
          {layers.map(renderLayer)}
        </div>
        <DividerControl
          handleAddComponent={(elem) => onAddElement(elem)}
          availableComponents={
            Object.keys(componentRegistry) as Array<
              keyof typeof componentRegistry
            >
          }
        />
        {/* Removed the existing LayerMenu outside the layers */}
      </div>
    </div>
  );
};

export default PreviewPanel;

// Menu component that appears at the top-left corner of a selected layer
interface MenuProps {
  x: number;
  y: number;
  width: number;
  height: number;
  handleAddComponent: (componentName: keyof typeof componentRegistry) => void;
  handleDuplicateComponent: () => void;
  handleDeleteComponent: () => void;
  availableComponents: Array<keyof typeof componentRegistry>;
}

const LayerMenu: React.FC<MenuProps> = ({
  x,
  y,
  width,
  height,
  handleAddComponent,
  handleDuplicateComponent,
  handleDeleteComponent,
  availableComponents,
}) => {
  return (
    <>
      <div
        className="fixed z-20"
        style={{
          top: y,
          left: x ,
        }}
      >
        <span className="h-5 group flex items-center rounded-bl-full rounded-r-full bg-white/90 p-0 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50/95 hover:h-10 transition-all duration-200 ease-in-out overflow-hidden cursor-pointer hover:cursor-auto">
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:size-8 transition-all duration-200 ease-in-out group-hover:opacity-30" />
          <span className="sr-only">Add component</span>
          <div className="overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-200 ease-in-out">
            <AddComponentsPopover
              className="flex-shrink w-min inline-flex"
              handleAddComponent={handleAddComponent}
              availableComponents={availableComponents}
            >
              <Button size="sm" variant="ghost">
                <span className="sr-only">Duplicate</span>
                <Plus className="h-5 w-5 text-gray-400" />
              </Button>
            </AddComponentsPopover>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDuplicateComponent}
            >
              <span className="sr-only">Duplicate</span>
              <Copy className="h-5 w-5 text-gray-400" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDeleteComponent}>
              <span className="sr-only">Delete</span>
              <Trash className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
        </span>
      </div>
    </>
  );
};

interface ClickableWrapperProps {
  layer: Layer;
  isSelected: boolean;
  onSelectElement: (layerId: string, event: React.MouseEvent) => void;
  children: ReactNode;
  onAddElement: (
    componentName: keyof typeof componentRegistry,
    parentId?: string,
    parentPosition?: number
  ) => void;
  onDuplicateLayer: () => void;
  onDeleteLayer: () => void;
}

const ClickableWrapper: React.FC<ClickableWrapperProps> = ({
  layer,
  isSelected,
  onSelectElement,
  children,
  onAddElement,
  onDuplicateLayer,
  onDeleteLayer,
}) => {
  const [boundingRect, setBoundingRect] = useState<DOMRect | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isSelected) {
      setBoundingRect(null);
      return;
    }

    const element = wrapperRef.current?.firstElementChild as HTMLElement | null;
    if (!element) {
      setBoundingRect(null);
      return;
    }

    const updateBoundingRect = () => {
      const rect = element.getBoundingClientRect();
      setBoundingRect(rect);
    };

    updateBoundingRect();

    let resizeObserver: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(updateBoundingRect);
      resizeObserver.observe(element);
    }

    const scrollParent = getScrollParent(element);
    if (scrollParent) {
      scrollParent.addEventListener("scroll", updateBoundingRect);
    }
    window.addEventListener("resize", updateBoundingRect);

    return () => {
      if (resizeObserver) {
        resizeObserver.unobserve(element);
        resizeObserver.disconnect();
      }
      if (scrollParent) {
        scrollParent.removeEventListener("scroll", updateBoundingRect);
      }
      window.removeEventListener("resize", updateBoundingRect);
    };
  }, [isSelected, layer.id, children]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectElement(layer.id, e);
  };

  return (
    <ErrorBoundary fallbackRender={ErrorFallback}>
      <Suspense fallback={<div>Loading...</div>}>
        <span
          ref={wrapperRef}
          onClick={handleClick}
          style={{ display: "contents" }} // Preserves layout
        >
          {children}
        </span>

        {isSelected && boundingRect && (
          <LayerMenu
            x={boundingRect.left + window.scrollX}
            y={boundingRect.bottom + window.scrollY}
            width={boundingRect.width}
            height={boundingRect.height}
            handleAddComponent={(elem) => onAddElement(elem, layer.id)}
            handleDuplicateComponent={onDuplicateLayer}
            handleDeleteComponent={onDeleteLayer}
            availableComponents={
              Object.keys(componentRegistry) as Array<keyof typeof componentRegistry>
            }
          />
        )}

        {isSelected && boundingRect && (
          <div
            className="fixed border-2 border-blue-500 pointer-events-none z-20"
            style={{
              top: boundingRect.top,
              left: boundingRect.left,
              width: boundingRect.width,
              height: boundingRect.height,
              boxSizing: "border-box",
              position: "fixed",
            }}
          />
        )}
      </Suspense>
    </ErrorBoundary>
  );
};

function ErrorFallback({ error }: { error: Error }) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <div className="p-4 border border-red-500 bg-red-100 text-red-700 rounded flex-grow w-full">
      <h3 className="font-bold mb-2">Component Error</h3>
      <p>Error: {error?.message || "Unknown error"}</p>
      <details className="mt-2">
        <summary className="cursor-pointer">Stack trace</summary>
        <pre className="mt-2 text-xs whitespace-pre-wrap">{error?.stack}</pre>
      </details>
    </div>
  );
}

function getScrollParent(element: HTMLElement | null): HTMLElement | null {
  if (!element) return null;

  const overflowRegex = /(auto|scroll)/;

  let parent: HTMLElement | null = element.parentElement;

  while (parent) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;

    if (overflowRegex.test(overflowY) || overflowRegex.test(overflowX)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}