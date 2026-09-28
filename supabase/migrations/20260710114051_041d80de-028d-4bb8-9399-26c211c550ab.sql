
-- Clean up legacy AI over-friending: keep at most one AI partner per non-AI user (male only),
-- delete other AI partner_requests and their direct_messages.

WITH keepers AS (
  SELECT DISTINCT ON (pr.addressee_id) pr.id, pr.addressee_id, pr.requester_id
  FROM public.partner_requests pr
  JOIN public.profiles bot ON bot.id = pr.requester_id AND bot.is_ai = true
  JOIN public.profiles usr ON usr.id = pr.addressee_id AND usr.is_ai = false
  WHERE usr.gender = 'male'
  ORDER BY pr.addressee_id, pr.created_at ASC
),
to_delete AS (
  SELECT pr.id, pr.requester_id AS bot_id, pr.addressee_id AS user_id
  FROM public.partner_requests pr
  JOIN public.profiles bot ON bot.id = pr.requester_id AND bot.is_ai = true
  JOIN public.profiles usr ON usr.id = pr.addressee_id AND usr.is_ai = false
  WHERE pr.id NOT IN (SELECT id FROM keepers)
)
DELETE FROM public.direct_messages dm
USING to_delete td
WHERE (dm.sender_id = td.bot_id AND dm.receiver_id = td.user_id)
   OR (dm.sender_id = td.user_id AND dm.receiver_id = td.bot_id);

DELETE FROM public.partner_requests pr
USING public.profiles bot, public.profiles usr
WHERE pr.requester_id = bot.id AND bot.is_ai = true
  AND pr.addressee_id = usr.id AND usr.is_ai = false
  AND pr.id NOT IN (
    SELECT DISTINCT ON (pr2.addressee_id) pr2.id
    FROM public.partner_requests pr2
    JOIN public.profiles b2 ON b2.id = pr2.requester_id AND b2.is_ai = true
    JOIN public.profiles u2 ON u2.id = pr2.addressee_id AND u2.is_ai = false
    WHERE u2.gender = 'male'
    ORDER BY pr2.addressee_id, pr2.created_at ASC
  );
