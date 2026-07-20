"use client";
import {Allotment} from "allotment"

import type { Id } from "@/convex/_generated/dataModel"
import { ConversationSideBar } from "@/features/conversations/components/conversation-sidebar";
import { Navbar } from "@/features/projects/components/navbar";

const MIN_SIDEBAR_WIDTH = 280
const MAX_SIDEBAR_WIDTH = 520
const DEFAULT_CONVERSATION_SIDE_WIDTH = 400
const DEFAULT_MAIN_SIZE = 1000

export const  ProjectIdLayout = ({
  children,
  projectId,
}: {
    children: React.ReactNode;
    projectId: Id<"projects">;
  }) => {
  return (
    <div className="w-full h-screen flex flex-col">
      <Navbar projectId={projectId} />
      <div className="flex-1 flex overflow-hidden">
        <Allotment
          className="flex-1"
          defaultSizes={[
            DEFAULT_CONVERSATION_SIDE_WIDTH,
            DEFAULT_MAIN_SIZE
          ]}
        >
          <Allotment.Pane
            snap
            minSize={MIN_SIDEBAR_WIDTH}
            maxSize={MAX_SIDEBAR_WIDTH}
            preferredSize={DEFAULT_CONVERSATION_SIDE_WIDTH}
          >
              <ConversationSideBar projectId={projectId}/>
          </Allotment.Pane>
          <Allotment.Pane>
      {children}
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}
