import uuid
from decimal import Decimal
from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','success','failed','refunded')",
            name="payments_status_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    razorpay_order_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    paid_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    player = relationship("Player", back_populates="payment")
