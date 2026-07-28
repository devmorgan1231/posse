use anchor_lang::prelude::*;

use super::crank::{crank_guard, Crank};
use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

pub(crate) fn handler(ctx: Context<Crank>) -> Result<()> {
    crank_guard(&ctx.accounts.caller.key(), &ctx.accounts.posse)?;
    let t = now()?;
    let p = &mut ctx.accounts.posse;
    require!(p.status == status::BOUGHT, PosseError::BadStatus);
    p.status = status::HELD;
    p.shares_issued_at = t;
    emit_cpi!(SharesIssued {
        posse: p.key(),
        at: t
    });
    Ok(())
}
