import { FOLLOW_UP_TIME_OPTIONS } from "@/domain/scenarios/follow-up-context";
import type { FollowUpContext, FollowUpTime } from "@/domain/scenarios/schema";

interface FollowUpContextFormProps {
  value: FollowUpContext;
  onChange(value: FollowUpContext): void;
}

const textareaClass =
  "mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

export function FollowUpContextForm({
  value,
  onChange,
}: FollowUpContextFormProps) {
  const update = <Key extends keyof FollowUpContext>(
    key: Key,
    nextValue: FollowUpContext[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-slate-950">
        Previous Conversation Context
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">
          Last conversation summary
          <textarea
            value={value.lastConversationSummary}
            onChange={(event) =>
              update("lastConversationSummary", event.target.value)
            }
            placeholder="Briefly describe what happened during the previous conversation."
            className={textareaClass}
          />
        </label>

        <label className="text-sm font-semibold text-slate-800">
          What did both parties agree on?
          <textarea
            value={value.agreedNextSteps}
            onChange={(event) => update("agreedNextSteps", event.target.value)}
            placeholder="What commitments, promises, or next steps were agreed?"
            className={textareaClass}
          />
        </label>

        <label className="text-sm font-semibold text-slate-800">
          When did the previous conversation happen?
          <select
            value={value.previousConversationTime}
            onChange={(event) =>
              update(
                "previousConversationTime",
                event.target.value as FollowUpTime,
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            {FOLLOW_UP_TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {value.previousConversationTime === "custom" ? (
          <label className="text-sm font-semibold text-slate-800">
            Previous conversation date
            <input
              type="date"
              value={value.customDate ?? ""}
              onChange={(event) => update("customDate", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </label>
        ) : null}

        <label className="text-sm font-semibold text-slate-800 lg:col-span-2">
          Additional notes{" "}
          <span className="font-normal text-slate-400">(Optional)</span>
          <textarea
            value={value.additionalNotes}
            onChange={(event) => update("additionalNotes", event.target.value)}
            placeholder="Any additional information the customer should remember."
            className={textareaClass}
          />
        </label>
      </div>
    </section>
  );
}
