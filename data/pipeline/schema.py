"""
Data schema for Neighbourhood Doughnut dimensions
Based on the 5-part recipe: target / indicator / threshold / snapshot / status
"""
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum

class Lens(str, Enum):
    """Four lenses of the Doughnut"""
    LOCAL_SOCIAL = "local_social"
    LOCAL_ECOLOGICAL = "local_ecological"
    GLOBAL_ECOLOGICAL = "global_ecological"
    GLOBAL_SOCIAL = "global_social"

class Status(str, Enum):
    """Assessment status of a dimension"""
    SHORTFALL = "shortfall"  # Below the social foundation
    MET = "met"  # Meeting targets
    OVERSHOOT = "overshoot"  # Exceeding ecological ceiling
    DESCRIPTIVE_ONLY = "descriptive_only"  # No official target exists
    UNKNOWN = "unknown"  # Data insufficient

class GeographyLevel(str, Enum):
    """Resolution of data"""
    WARD = "ward"
    LSOA_AGGREGATED = "lsoa_aggregated"
    MSOA_AGGREGATED = "msoa_aggregated"
    POSTCODE_AGGREGATED = "postcode_aggregated"
    BOROUGH_INHERITED = "borough_inherited"
    LONDON_INHERITED = "london_inherited"
    NATIONAL_INHERITED = "national_inherited"

class Confidence(str, Enum):
    """Data quality and reliability"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class Target:
    """Policy target or aspiration"""
    text: str  # Verbatim where possible
    source_body: Optional[str] = None  # GLA | UK Government | none_found
    has_official_target: bool = False  # Roughly half of Local Social dimensions have NO target

@dataclass
class Threshold:
    """What counts as safe and just"""
    value: Optional[float] = None
    unit: Optional[str] = None
    description: Optional[str] = None

@dataclass
class Snapshot:
    """Current measurement"""
    value: Optional[Any] = None  # Can be numeric, string, or complex
    unit: Optional[str] = None
    year: Optional[int] = None
    date: Optional[str] = None  # For more precise timestamps

@dataclass
class Source:
    """Data provenance"""
    name: str
    url: Optional[str] = None
    accessed: Optional[str] = None  # ISO date
    notes: Optional[str] = None  # e.g. "downscaled from borough using X assumption"

@dataclass
class Dimension:
    """
    One dimension in one lens.

    Implements the 5-part recipe:
    - target: policy goal
    - indicator: metric used to track it
    - threshold: what counts as safe/just
    - snapshot: current measurement
    - status: shortfall/met/overshoot/descriptive_only/unknown
    """
    ward: str
    ward_code: str
    lens: Lens
    dimension: str  # e.g. "housing", "health", "mobility"

    target: Target
    indicator: str
    threshold: Threshold
    snapshot: Snapshot
    status: Status

    geography_of_data: GeographyLevel
    source: Source
    confidence: Confidence

    community_notes: List[Dict[str, Any]] = None  # Empty for Phase 1

    def __post_init__(self):
        if self.community_notes is None:
            self.community_notes = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "ward": self.ward,
            "ward_code": self.ward_code,
            "lens": self.lens.value if isinstance(self.lens, Enum) else self.lens,
            "dimension": self.dimension,
            "target": asdict(self.target),
            "indicator": self.indicator,
            "threshold": asdict(self.threshold),
            "snapshot": asdict(self.snapshot),
            "status": self.status.value if isinstance(self.status, Enum) else self.status,
            "geography_of_data": self.geography_of_data.value if isinstance(self.geography_of_data, Enum) else self.geography_of_data,
            "source": asdict(self.source),
            "confidence": self.confidence.value if isinstance(self.confidence, Enum) else self.confidence,
            "community_notes": self.community_notes
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Dimension':
        """Create from dictionary"""
        return cls(
            ward=data["ward"],
            ward_code=data["ward_code"],
            lens=Lens(data["lens"]),
            dimension=data["dimension"],
            target=Target(**data["target"]),
            indicator=data["indicator"],
            threshold=Threshold(**data["threshold"]),
            snapshot=Snapshot(**data["snapshot"]),
            status=Status(data["status"]),
            geography_of_data=GeographyLevel(data["geography_of_data"]),
            source=Source(**data["source"]),
            confidence=Confidence(data["confidence"]),
            community_notes=data.get("community_notes", [])
        )

@dataclass
class WardPortrait:
    """Complete four-lens portrait for one ward"""
    ward: str
    ward_code: str
    local_social: List[Dimension]
    local_ecological: List[Dimension]
    global_ecological: List[Dimension]
    global_social: List[Dimension]
    generated_at: Optional[str] = None  # ISO timestamp

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "ward": self.ward,
            "ward_code": self.ward_code,
            "local_social": [d.to_dict() for d in self.local_social],
            "local_ecological": [d.to_dict() for d in self.local_ecological],
            "global_ecological": [d.to_dict() for d in self.global_ecological],
            "global_social": [d.to_dict() for d in self.global_social],
            "generated_at": self.generated_at
        }

# Helper functions for creating common dimension patterns

def create_descriptive_dimension(
    ward: str,
    ward_code: str,
    lens: Lens,
    dimension_name: str,
    indicator: str,
    snapshot: Snapshot,
    source: Source,
    geography: GeographyLevel,
    confidence: Confidence = Confidence.MEDIUM,
    threshold_description: Optional[str] = None
) -> Dimension:
    """
    Create a dimension with no official target (descriptive_only status).
    Used for ~7 of the 15 Local Social dimensions.
    """
    return Dimension(
        ward=ward,
        ward_code=ward_code,
        lens=lens,
        dimension=dimension_name,
        target=Target(
            text="No official GLA or UK Government target established for this dimension.",
            source_body="none_found",
            has_official_target=False
        ),
        indicator=indicator,
        threshold=Threshold(description=threshold_description),
        snapshot=snapshot,
        status=Status.DESCRIPTIVE_ONLY,
        geography_of_data=geography,
        source=source,
        confidence=confidence
    )

def create_targeted_dimension(
    ward: str,
    ward_code: str,
    lens: Lens,
    dimension_name: str,
    target: Target,
    indicator: str,
    threshold: Threshold,
    snapshot: Snapshot,
    status: Status,
    source: Source,
    geography: GeographyLevel,
    confidence: Confidence = Confidence.MEDIUM
) -> Dimension:
    """
    Create a dimension with an official target and shortfall/met/overshoot status.
    """
    return Dimension(
        ward=ward,
        ward_code=ward_code,
        lens=lens,
        dimension=dimension_name,
        target=target,
        indicator=indicator,
        threshold=threshold,
        snapshot=snapshot,
        status=status,
        geography_of_data=geography,
        source=source,
        confidence=confidence
    )
