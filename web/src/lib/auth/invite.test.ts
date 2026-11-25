import { describe, expect, it } from 'vitest';
import { ARUN_INVITE, inviteOf } from './invite.ts';

describe('the invite link', () => {
	it("opens Arun's invite to the Dutta household for any token", () => {
		expect(inviteOf('8Kq2Xw')).toEqual({ kind: 'open', invite: ARUN_INVITE });
		expect(ARUN_INVITE).toMatchObject({ from: 'Arun', household: 'Dutta', until: 'Sun 6 Sep 18:00', joiner: 'asha' });
	});

	it('says when a used link was used, and when an expired one ended', () => {
		expect(inviteOf('used')).toEqual({ kind: 'used', invite: ARUN_INVITE, usedAt: 'Sun 6 Sep at 10:12' });
		expect(inviteOf('expired')).toEqual({ kind: 'expired', invite: ARUN_INVITE, endedAt: 'Sun 6 Sep at 18:00' });
	});
});
