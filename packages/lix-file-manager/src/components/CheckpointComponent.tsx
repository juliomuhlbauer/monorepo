import { useState } from "react";
import IconChevron from "@/components/icons/IconChevron.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import timeAgo from "@/helper/timeAgo.ts";
import clsx from "clsx";
import ChangeDot from "./ChangeDot.tsx";
import DiscussionPreview from "./DiscussionPreview.tsx";

export const CheckpointComponent = (props: {
  checkpointChangeSet: {
    id: string;
    discussion_id: string | null;
    first_comment_content: string | null;
    author_name: string;
    checkpoint_created_at: string | null;
  }
  showTopLine: boolean;
  showBottomLine: boolean;
}) => {
  const [isExpandedState, setIsExpandedState] = useState<boolean>(false);

  // Don't render anything if there's no change data
  if (!props.checkpointChangeSet || !props.checkpointChangeSet.id) {
    return null;
  }

  return (
    <div
      className="flex group hover:bg-slate-50 rounded-md cursor-pointer flex-shrink-0 pr-2"
      onClick={(e) => {
        e.stopPropagation();
        setIsExpandedState(!isExpandedState);
      }}
    >
      <ChangeDot top={props.showTopLine} bottom={props.showBottomLine} />
      <div className="flex-1">
        <div className="h-12 flex items-center w-full">
          <p className="flex-1 truncate text-ellipsis overflow-hidden">
            {props.checkpointChangeSet.author_name}:{" "}
            <span className="text-slate-500">
              {props.checkpointChangeSet.first_comment_content || "Create checkpoint"}
            </span>
          </p>
          <div className="flex gap-3 items-center">
            <span className="text-sm font-medium text-slate-500 block pr-2">
              {timeAgo(props.checkpointChangeSet.checkpoint_created_at!)}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="w-8 h-8 cursor-pointer hover:opacity-90 transition-opacity">
                    <AvatarImage src="#" alt="#" />
                    <AvatarFallback className="bg-[#fff] text-[#141A21] border border-[#DBDFE7]">
                      {props.checkpointChangeSet.author_name
                        ? props.checkpointChangeSet.author_name
                          .substring(0, 2)
                          .toUpperCase()
                        : "XX"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{props.checkpointChangeSet.author_name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon">
              <IconChevron
                className={clsx(
                  isExpandedState ? "rotate-180" : "rotate-0",
                  "transition"
                )}
              />
            </Button>
          </div>
        </div>
        {isExpandedState && (
          <div className="flex flex-col gap-2 pb-2">
            {/* Option to introduce tabs - Discussion | Changes */}
            <div className="flex flex-col justify-center items-start w-full gap-4 sm:gap-6 pt-2 pb-4 sm:pb-6 overflow-hidden">
              {/* list change diffs */}
            </div>
            {props.checkpointChangeSet.discussion_id && (
              <DiscussionPreview
                key={props.checkpointChangeSet.discussion_id}
                discussionId={props.checkpointChangeSet.discussion_id}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckpointComponent;
