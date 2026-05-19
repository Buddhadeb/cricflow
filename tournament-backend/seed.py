"""
Seed script — clears existing data and inserts realistic test data.
Run inside the backend container:  python seed.py
"""
import asyncio, uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import delete, text
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.tournament import Tournament
from app.models.player import Player
from app.models.team import Team, TeamPlayer
from app.models.payment import Payment
from app.models.auction import AuctionBid, AuctionSession
from app.utils.auth import get_password_hash

PASSWORD = "Test@1234"

# ── helpers ──────────────────────────────────────────────────────────────────

def now():  return datetime.now(timezone.utc)
def days(n): return now() + timedelta(days=n)

PLACEHOLDER_PHOTO = "https://ui-avatars.com/api/?background=0f172a&color=f59e0b&bold=true&name="

# ── data definitions ──────────────────────────────────────────────────────────

USERS = [
    {"name": "Admin",          "email": "admin@cricflow.com",    "role": "admin"},
    {"name": "Ravi Kumar",     "email": "ravi@test.com",         "role": "user"},
    {"name": "Priya Sharma",   "email": "priya@test.com",        "role": "user"},
    {"name": "Arjun Singh",    "email": "arjun@test.com",        "role": "user"},
    {"name": "Meena Patel",    "email": "meena@test.com",        "role": "user"},
    {"name": "Deepak Roy",     "email": "deepak@test.com",       "role": "user"},
    {"name": "Suman Das",      "email": "suman@test.com",        "role": "user"},
    {"name": "Kartik Bose",    "email": "kartik@test.com",       "role": "user"},
    {"name": "Ananya Ghosh",   "email": "ananya@test.com",       "role": "user"},
    {"name": "Vikram Joshi",   "email": "vikram@test.com",       "role": "user"},
    {"name": "Neha Reddy",     "email": "neha@test.com",         "role": "user"},
    {"name": "Suresh Nair",    "email": "suresh@test.com",       "role": "user"},
    {"name": "Pooja Iyer",     "email": "pooja@test.com",        "role": "user"},
]

TOURNAMENTS = [
    {
        "name": "Satui Premier League 2025",
        "description": "The biggest cricket tournament in Satui district. All formats welcome. Open registration now!",
        "status": "registration",
        "registration_fee": 150,
        "max_teams": 8,
        "overs": 20,
        "venue": "Satui Cricket Ground, West Bengal",
        "start_date": days(30),
        "end_date": days(60),
    },
    {
        "name": "Bengal T14 Cup",
        "description": "Fast-paced 14-over format. Teams are being built through live auction.",
        "status": "auction",
        "registration_fee": 200,
        "max_teams": 6,
        "overs": 14,
        "venue": "Durgapur Sports Complex",
        "start_date": days(10),
        "end_date": days(25),
    },
    {
        "name": "Calcutta Cricket League",
        "description": "Season 3 — champions crowned! Full league results available.",
        "status": "completed",
        "registration_fee": 100,
        "max_teams": 4,
        "overs": 10,
        "venue": "Eden Gardens Annexe, Kolkata",
        "start_date": days(-60),
        "end_date": days(-10),
    },
]

# players per tournament  (user index, player info)
SPL_PLAYERS = [
    (1,  "Ravi Kumar",   24, "batsman",       "M"),
    (2,  "Priya Sharma", 22, "bowler",        "S"),
    (3,  "Arjun Singh",  28, "all_rounder",   "L"),
    (4,  "Meena Patel",  21, "wicket_keeper", "M"),
    (5,  "Deepak Roy",   26, "batsman",       "L"),
]

T14_PLAYERS = [
    (1,  "Ravi Kumar",   24, "batsman",       "M"),
    (2,  "Priya Sharma", 22, "bowler",        "S"),
    (3,  "Arjun Singh",  28, "all_rounder",   "L"),
    (4,  "Meena Patel",  21, "wicket_keeper", "M"),
    (5,  "Deepak Roy",   26, "batsman",       "L"),
    (6,  "Suman Das",    29, "bowler",        "XL"),
    (7,  "Kartik Bose",  23, "all_rounder",   "L"),
    (8,  "Ananya Ghosh", 20, "batsman",       "S"),
    (9,  "Vikram Joshi", 31, "bowler",        "XL"),
    (10, "Neha Reddy",   25, "all_rounder",   "M"),
    (11, "Suresh Nair",  27, "batsman",       "L"),
    (12, "Pooja Iyer",   22, "wicket_keeper", "M"),
]

CCL_PLAYERS = [
    (1,  "Ravi Kumar",   24, "batsman",       "M"),
    (3,  "Arjun Singh",  28, "all_rounder",   "L"),
    (5,  "Deepak Roy",   26, "batsman",       "L"),
    (7,  "Kartik Bose",  23, "bowler",        "L"),
    (9,  "Vikram Joshi", 31, "all_rounder",   "XL"),
    (11, "Suresh Nair",  27, "batsman",       "L"),
]

T14_TEAMS = [
    {"name": "Durgapur Dynamos",  "budget": 500000},
    {"name": "Bengal Blazers",    "budget": 500000},
    {"name": "Asansol Avengers",  "budget": 500000},
]

CCL_TEAMS = [
    {"name": "Kolkata Kings",     "budget": 300000},
    {"name": "Howrah Hawks",      "budget": 300000},
]

# ── main ──────────────────────────────────────────────────────────────────────

async def seed():
    async with AsyncSessionLocal() as db:
        print("🗑  Clearing existing data …")
        await db.execute(delete(AuctionBid))
        await db.execute(delete(AuctionSession))
        await db.execute(delete(TeamPlayer))
        await db.execute(delete(Payment))
        await db.execute(delete(Player))
        await db.execute(delete(Team))
        await db.execute(delete(Tournament))
        await db.execute(delete(User))
        await db.commit()

        # ── Users ──
        print("👤 Creating users …")
        user_objs = []
        for u in USERS:
            obj = User(
                id=uuid.uuid4(),
                name=u["name"],
                email=u["email"],
                password_hash=get_password_hash(PASSWORD),
                role=u["role"],
                is_active=True,
            )
            db.add(obj)
            user_objs.append(obj)
        await db.commit()
        print(f"   ✓ {len(user_objs)} users created  (password: {PASSWORD})")

        admin = user_objs[0]

        # ── Tournaments ──
        print("🏆 Creating tournaments …")
        t_objs = []
        for t in TOURNAMENTS:
            obj = Tournament(
                id=uuid.uuid4(),
                organizer_id=admin.id,
                is_public=True,
                **t,
            )
            db.add(obj)
            t_objs.append(obj)
        await db.commit()
        spl, t14, ccl = t_objs
        print(f"   ✓ {len(t_objs)} tournaments created")

        # ── helper: create player + payment ──
        async def add_player(user_idx, name, age, ptype, size, tournament, fee, paid=True, approved=True):
            user = user_objs[user_idx]
            base = Decimal("1000") + Decimal(str(user_idx * 500))
            player = Player(
                id=uuid.uuid4(),
                user_id=user.id,
                tournament_id=tournament.id,
                name=name,
                age=age,
                address=f"123 Cricket Lane, West Bengal",
                player_type=ptype,
                tshirt_size=size,
                photo_url=f"{PLACEHOLDER_PHOTO}{name.replace(' ', '+')}",
                base_price=base,
                status="available" if approved else "pending",
                is_approved=approved,
            )
            db.add(player)
            await db.flush()

            payment = Payment(
                id=uuid.uuid4(),
                player_id=player.id,
                amount=Decimal(str(fee)),
                currency="INR",
                razorpay_order_id=f"order_{uuid.uuid4().hex[:16]}",
                razorpay_payment_id=f"pay_{uuid.uuid4().hex[:16]}" if paid else None,
                razorpay_signature="seed_signature" if paid else None,
                status="success" if paid else "pending",
                paid_at=now() if paid else None,
            )
            db.add(payment)
            return player

        # ── SPL players (registration open) — 3 paid+approved, 2 pending ──
        print("🏏 Adding players to Satui Premier League (registration) …")
        spl_players = []
        for i, (uidx, name, age, ptype, size) in enumerate(SPL_PLAYERS):
            paid = i < 3      # first 3 paid, last 2 payment pending
            approved = paid
            p = await add_player(uidx, name, age, ptype, size, spl, spl.registration_fee, paid=paid, approved=approved)
            spl_players.append(p)
        await db.commit()
        print(f"   ✓ {len(spl_players)} players (3 paid, 2 awaiting payment)")

        # ── T14 players (auction) — all paid+approved ──
        print("🏏 Adding players to Bengal T14 Cup (auction) …")
        t14_players = []
        for uidx, name, age, ptype, size in T14_PLAYERS:
            p = await add_player(uidx, name, age, ptype, size, t14, t14.registration_fee, paid=True, approved=True)
            t14_players.append(p)
        await db.commit()
        print(f"   ✓ {len(t14_players)} players (all paid & approved)")

        # ── CCL players (completed) — all paid+approved ──
        print("🏏 Adding players to Calcutta Cricket League (completed) …")
        ccl_players = []
        for uidx, name, age, ptype, size in CCL_PLAYERS:
            p = await add_player(uidx, name, age, ptype, size, ccl, ccl.registration_fee, paid=True, approved=True)
            ccl_players.append(p)
        await db.commit()
        print(f"   ✓ {len(ccl_players)} players (all paid & approved)")

        # ── T14 Teams (players stay 'available' — auction is live) ──
        print("🏆 Creating teams for Bengal T14 Cup …")
        t14_team_objs = []
        for i, t in enumerate(T14_TEAMS):
            budget = Decimal(str(t["budget"]))
            team = Team(
                id=uuid.uuid4(),
                owner_id=user_objs[i + 1].id,
                tournament_id=t14.id,
                name=t["name"],
                total_budget=budget,
                remaining_budget=budget,
            )
            db.add(team)
            t14_team_objs.append(team)
        await db.commit()
        print(f"   ✓ {len(t14_team_objs)} teams created (players remain available for live auction)")

        # ── CCL Teams ──
        print("🏆 Creating teams for Calcutta Cricket League …")
        ccl_team_objs = []
        for i, t in enumerate(CCL_TEAMS):
            budget = Decimal(str(t["budget"]))
            team = Team(
                id=uuid.uuid4(),
                owner_id=user_objs[i + 1].id,
                tournament_id=ccl.id,
                name=t["name"],
                total_budget=budget,
                remaining_budget=budget,
            )
            db.add(team)
            ccl_team_objs.append(team)
        await db.commit()

        half = len(ccl_players) // 2
        ccl_chunks = [ccl_players[:half], ccl_players[half:]]
        for team, chunk in zip(ccl_team_objs, ccl_chunks):
            spent = Decimal("0")
            for player in chunk:
                price = player.base_price + Decimal("150")
                tp = TeamPlayer(
                    id=uuid.uuid4(),
                    team_id=team.id,
                    player_id=player.id,
                    sold_price=price,
                )
                db.add(tp)
                player.status = "sold"
                spent += price
            team.remaining_budget = team.total_budget - spent
        await db.commit()
        print(f"   ✓ {len(ccl_team_objs)} teams created")

        # ── Summary ──
        print("\n" + "=" * 55)
        print("✅  Seed complete!")
        print("=" * 55)
        print(f"  Users       : {len(user_objs)} (admin + {len(user_objs)-1} players)")
        print(f"  Tournaments : {len(t_objs)}")
        print(f"  Players     : {len(spl_players) + len(t14_players) + len(ccl_players)}")
        print(f"  Teams       : {len(t14_team_objs) + len(ccl_team_objs)}")
        print()
        print("  Login credentials (all users):")
        print(f"    admin@cricflow.com / {PASSWORD}  (role: admin)")
        for u in USERS[1:]:
            print(f"    {u['email']} / {PASSWORD}")

asyncio.run(seed())
