from dataclasses import dataclass


@dataclass(frozen=True)
class Option:
    spot: float
    strike: float
    rate: float
    vol: float
    time: float
    dividend: float = 0.0

    def __post_init__(self) -> None:
        if self.spot <= 0 or self.strike <= 0:
            raise ValueError("spot and strike must be positive")
        if self.vol < 0 or self.time < 0:
            raise ValueError("vol and time cannot be negative")
