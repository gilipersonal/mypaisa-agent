/** The invite link's stub (MA-185, 1b "An invite link"): the figure set's one invite (`docs/design/figures/talk-v5.json`):
 * Arun's of Sat 5 Sep 18:00 to the Dutta household, good until Sun 6 Sep 18:00, used by Asha on Sun 6 Sep at 10:12.
 * MA-143 reads the real invite from the api. Review switches: `/join/used` and `/join/expired`; any other token opens
 * Arun's invite. */

export interface Invite {
	/** Who sent it, by first name. */
	from: string;
	household: string;
	/** The last moment it works, as the page says it. */
	until: string;
	/** Who joins with it: the stub signs them in as this member. */
	joiner: string;
}

export type InviteState =
	| { kind: 'open'; invite: Invite }
	| { kind: 'used'; invite: Invite; usedAt: string }
	| { kind: 'expired'; invite: Invite; endedAt: string };

export const ARUN_INVITE: Invite = { from: 'Arun', household: 'Dutta', until: 'Sun 6 Sep 18:00', joiner: 'asha' };

export function inviteOf(token: string): InviteState {
	if (token === 'used') return { kind: 'used', invite: ARUN_INVITE, usedAt: 'Sun 6 Sep at 10:12' };
	if (token === 'expired') return { kind: 'expired', invite: ARUN_INVITE, endedAt: 'Sun 6 Sep at 18:00' };
	return { kind: 'open', invite: ARUN_INVITE };
}
