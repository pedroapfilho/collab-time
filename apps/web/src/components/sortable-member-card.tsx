"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { MemberCard } from "@/components/member-card";
import type { MemberCardProps } from "@/components/member-card";

const SortableMemberCard = (props: MemberCardProps) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.member.id,
  });

  const style = {
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      className={isDragging ? "cursor-grabbing" : "cursor-grab"}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable item, press Space to lift"
    >
      <MemberCard {...props} />
    </div>
  );
};

export { SortableMemberCard };
