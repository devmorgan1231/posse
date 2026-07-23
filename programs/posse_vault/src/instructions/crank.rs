use anchor_lang::prelude::*;

#[cfg(feature = "mut-i3")]
use crate::errors::PosseError;
use crate::state::*;

#[allow(unused_variables)]
pub fn crank_guard(caller: &Pubkey, posse: &Posse) -> Result<()> {
    #[cfg(feature = "mut-i3")]
    require_keys_eq!(*caller, posse.organizer, PosseError::MutantOrganizerOnly);
    Ok(())
}

#[event_cpi]
#[derive(Accounts)]
pub struct Crank<'info> {
    pub caller: Signer<'info>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
}
