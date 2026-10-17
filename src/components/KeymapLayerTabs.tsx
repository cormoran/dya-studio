import { useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { IconGripVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";
import { EditorTooltip } from "./EditorTooltip";

type Layer = { id: number; name: string };
type Props = {
  layers: Layer[];
  selectedIndex: number;
  editing: boolean;
  busy: boolean;
  onSelect: (index: number) => void;
  onMove: (from: number, to: number) => Promise<void>;
  onRename: (index: number) => void;
  onDelete: (index: number) => void;
};

export function KeymapLayerTabs(props: Props) {
  const { t } = useLanguage();
  const ids = props.layers.map((layer) => layer.id);
  const [order, setOrder] = useState(ids);
  const [dragging, setDragging] = useState(false);
  const [committing, setCommitting] = useState(false);
  const orderRef = useRef(order);
  // External reload/discard can replace the list. A failed move also resets the
  // optimistic order when the commit finishes; device order remains authoritative.
  if (!dragging && !committing && order.join() !== ids.join()) {
    setOrder(ids);
    orderRef.current = ids;
  }
  const busy = props.busy || committing;
  return (
    <Reorder.Group
      axis="x"
      values={order}
      onReorder={(next) => {
        orderRef.current = next;
        setOrder(next);
      }}
      as="div"
      role="group"
      aria-label={t("Keymap layers")}
      className="keymap-layer-tabs flex min-w-0 flex-1 gap-1 overflow-x-auto p-1"
      layoutScroll
    >
      {order.map((id) => {
        const index = props.layers.findIndex((layer) => layer.id === id);
        if (index < 0) return null;
        return (
          <LayerItem
            key={id}
            {...props}
            busy={busy}
            layer={props.layers[index]}
            index={index}
            onDragStart={() => setDragging(true)}
            onDragEnd={async () => {
              setDragging(false);
              setCommitting(true);
              try {
                await props.onMove(index, orderRef.current.indexOf(id));
              } finally {
                setCommitting(false);
              }
            }}
          />
        );
      })}
    </Reorder.Group>
  );
}

function LayerItem({
  layer,
  index,
  onDragStart,
  onDragEnd,
  ...props
}: Props & {
  layer: Layer;
  index: number;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useLanguage();
  const controls = useDragControls();
  const name = layer.name || t("Layer {{id}}", { id: index });
  const reorderLabel = t("Reorder layer {{layer}}", { layer: name });
  return (
    <Reorder.Item
      as="div"
      value={layer.id}
      layout="position"
      dragListener={false}
      dragControls={controls}
      drag={props.editing && !props.busy ? "x" : false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-selected={index === props.selectedIndex}
      data-editing={props.editing}
      className="keymap-layer-item rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]"
    >
      {props.editing && (
        <EditorTooltip
          content={t(
            "Drag to reorder. Use Left or Right arrow keys to move a layer.",
          )}
        >
          <button
            type="button"
            className="keymap-layer-icon keymap-layer-drag"
            aria-label={reorderLabel}
            disabled={props.busy}
            onPointerDown={(event) => {
              if (!props.busy) controls.start(event);
            }}
            onKeyDown={(event) => {
              const to =
                event.key === "ArrowLeft"
                  ? index - 1
                  : event.key === "ArrowRight"
                    ? index + 1
                    : index;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight")
                event.preventDefault();
              if (
                !props.busy &&
                to !== index &&
                to >= 0 &&
                to < props.layers.length
              )
                void props.onMove(index, to);
            }}
          >
            <IconGripVertical size={16} />
          </button>
        </EditorTooltip>
      )}
      <button
        type="button"
        className="keymap-layer whitespace-nowrap font-medium"
        aria-pressed={index === props.selectedIndex}
        aria-disabled={props.editing}
        onClick={() => {
          if (!props.editing) props.onSelect(index);
        }}
      >
        {name}
      </button>
      {props.editing && (
        <>
          <EditorTooltip content={t("Rename layer {{layer}}", { layer: name })}>
            <button
              type="button"
              className="keymap-layer-icon"
              aria-label={t("Rename layer {{layer}}", { layer: name })}
              disabled={props.busy}
              onClick={() => props.onRename(index)}
            >
              <IconPencil size={16} />
            </button>
          </EditorTooltip>
          <EditorTooltip content={t("Delete layer {{layer}}", { layer: name })}>
            <button
              type="button"
              className="keymap-layer-icon text-[var(--color-warning)]"
              aria-label={t("Delete layer {{layer}}", { layer: name })}
              disabled={props.busy || props.layers.length <= 1}
              onClick={() => props.onDelete(index)}
            >
              <IconTrash size={16} />
            </button>
          </EditorTooltip>
        </>
      )}
    </Reorder.Item>
  );
}
