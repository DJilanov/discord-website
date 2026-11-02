import Link from "next/link";
import { kfcWelcomeComponents } from "@/content/kfc-raid-welcome";
import { signupStatusExplanation } from "@/lib/raids/event-preview";

export const metadata = { title: "How to sign up for a raid | KFC" };

export default function RaidSignupHelp(): React.JSX.Element {
  const schedules = kfcWelcomeComponents()[0].components;
  return (
    <article className="raid-signup-help">
      <p className="eyebrow">KFC · Forever &amp; TBC</p>
      <h1>Your first raid signup</h1>
      <p>
        Choose a raid, add your character and confirm that you want to attend.
        KFC guild members receive roster priority; PUG players are welcome where
        places remain.
      </p>
      <div className="raid-toolbar">
        {schedules.map((button) => (
          <a className="button primary" key={button.label} href={button.url}>
            {button.label}
          </a>
        ))}
      </div>
      <ol className="raid-help-steps">
        <li>
          <h2>Find your raid</h2>
          <p>
            Open the schedule for your game, then a raid post. Check the time
            shown by Discord, normal or semi-hardcore pace, preparation, signup
            deadline and linked loot rules.
          </p>
        </li>
        <li>
          <h2>Press Sign up</h2>
          <p>
            The character setup and confirmation prompts appear privately to
            you. Your signup details are shared with the event audience shown
            before confirmation.
          </p>
          <div className="raid-help-example">
            <strong>First time · Your character</strong>
            <p>
              Enter your in-game name, choose class and specialization, then
              press <code>Save character &amp; continue</code>.
            </p>
            <p>
              Your character is saved. Continue to the raid confirmation below.
            </p>
          </div>
          <div className="raid-help-example">
            <strong>Next · This raid</strong>
            <p>
              Select your saved character, check your role and availability, and
              review the rules. Press <code>Confirm signup</code>.
            </p>
          </div>
          <p>
            Returning players can choose a saved character and go straight to
            confirmation. Add a separate character for each game or realm you
            play.
          </p>
        </li>
        <li>
          <h2>Check your result</h2>
          <p>
            Read the result before closing the prompt. An open signup is
            followed by the leader selecting the roster.
          </p>
          <dl>
            {[
              ["Signed up", "registered"],
              ["Confirmed", "accepted"],
              ["Awaiting approval", "pending"],
              ["Bench", "bench"],
            ].map(([label, status]) => (
              <div key={status}>
                <dt>{label}</dt>
                <dd>{signupStatusExplanation(status)}</dd>
              </div>
            ))}
          </dl>
        </li>
      </ol>
      <section>
        <h2>Plans changed?</h2>
        <p>
          Open <code>My signup</code> on the original raid post. Use Tentative
          if you are unsure, Absent if you cannot attend, or Withdraw to remove
          your signup. Check the confirmation: these actions release your seat
          and clear soft reserves.
        </p>
      </section>
      <section>
        <h2>Using Raid-Helper?</h2>
        <p>
          Open the original signup linked from that raid's post and use
          Raid-Helper's buttons. Your roster stays there; you do not need to
          sign up a second time through another tool.
        </p>
      </section>
      <section>
        <h2>Common questions</h2>
        <dl>
          <div>
            <dt>I saved my character. Am I signed up?</dt>
            <dd>
              Continue to the raid confirmation and press Confirm signup. Saving
              a character is a separate step.
            </dd>
          </div>
          <div>
            <dt>I clicked Interested on a Discord Event.</dt>
            <dd>
              Open its linked raid post and complete the character signup.
              Interested follows the event; it does not reserve a place.
            </dd>
          </div>
          <div>
            <dt>The interaction expired or I am unsure it worked.</dt>
            <dd>
              Reopen the original post and check My signup. It shows the saved
              result before you try again.
            </dd>
          </div>
          <div>
            <dt>Do I need to join the guild?</dt>
            <dd>
              Eligible PUG players can sign up for open raids. Guild membership
              and guild-priority roster selection are explained in the event.
            </dd>
          </div>
          <div>
            <dt>Can I get raid alerts?</dt>
            <dd>
              Use the Raid alerts link on your game's schedule and react with
              the bell. The optional digest covers raids in the next 24 hours,
              after 18:00 Central European time. Remove the reaction to
              unsubscribe. Your Discord notification settings apply.
            </dd>
          </div>
        </dl>
      </section>
      <div className="raid-toolbar">
        <a
          className="button secondary"
          href="https://discord.com/channels/1411533815356194968/1557974292854083615"
        >
          Ask for help
        </a>
        <Link className="text-link" href="/raids">
          My events
        </Link>
      </div>
    </article>
  );
}
