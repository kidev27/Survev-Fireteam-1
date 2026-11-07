# Dead Air

A snowbound mountaintop broadcast relay built as a crooked chain of rooms and
terraces. The cable station sits at the southwest end, while the damaged dish
anchors the northeast cliff. All surface routes share one gameplay level; the
cable service tunnel is an actual underground layer with two native stairs.

## Route design

The arrival vestibule gives the squad two equally priced 750 exits: north into
Broadcast Hall or east into Emergency Stores. Those spaces are joined by an
open loading doorway, making the first purchases an orientation choice and
allowing a compact arrival loop once both exits are bought. Neither purchase
forces the squad into a one-way corridor.

Broadcast's stepped L-shaped footprint leads into two distinct mid-map routes:
the Control Room, and Generator House plus its open Switchyard. The optional northern footbridge crosses the cleft from Switchyard to Dish Yard.
The equipment racks make short controlled firing lanes, while outside the broad Snow Terrace
lets squads regroup. Power is in Generator House; the upgrade bench is by the
far dish apron. Buying into either Dish Yard or the terrace opens their shared
ridge circuit. The powered storm door adds a shorter return through Controls.

The underground cable tunnel connects Broadcast and Stores. Both landings are
behind the arrival purchases, and both destinations already have an open surface
connection. Taking the tunnel therefore offers shelter and a different approach
without opening a room behind an unpaid gate. The tunnel has no independent
zombie entry: enemies must follow operators down the same stairs.

## Visual and collision plan

Custom fixtures include a rust-red stranded cable cabin, analog audio consoles,
transmitter racks, generator banks, ceramic switch cabinets, cable reels, broken
antenna panels and the large damaged dish. Snowbanks are solid obstacles with
explicit footprints, not decorative white smears that secretly stop players.
The common art generator reads the same authored shapes that build collision.

The palette uses chalk snow, blue-gray rock, aged red hardware and amber interior
light. Flat floors and sparse snow wear keep players and pickups visible. Roofed
interiors have independent fade/visibility; the surrounding ridge remains open.
The dish silhouette stays within its solid collision footprint and never hides
an otherwise walkable route.

## Compatibility

Internal map name: `zombie_dead_air`; layout key: `deadair`; footprint: 220 × 180 inside a 252 × 212 map.
The familiar gate, power, moving mystery box, five perk and upgrade rules remain.
Zombies enter only surface zones the operators have opened and use native stairs
when pursuing downstairs. No falling, snow-slowing or weather-damage rule is added.
