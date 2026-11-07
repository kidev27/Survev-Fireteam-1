# High Water

A coastal evacuation stopped halfway through boarding. The ticket office remains
occupied; outside, two gangways lead to a grounded ferry carrying an abandoned
ambulance. The playable footprint is a bent terminal and quay beside a long ship,
not a rectangular building with renamed rooms.

## Routes

- **Terminal:** ticket refuge → departures → quay → customs → ticket refuge.
  Departures costs 750; customs costs 1000 and leads freely to the quay.
- **Ferry:** quay → forward gangway → foredeck → vehicle deck → aft gangway → quay.
  Either gangway's 1250 shutter buys access to the ship; buying the other closes
  the longer evacuation loop. Gangways are 10 units wide, with 6-unit shutters.
- **Freight:** departures → shore-power shed → freight pier → quay → departures.
  Power opens the freight-to-quay gate, giving a useful permanent shortcut.
- **Engine deck:** two native staircases, 24 units apart, connect the ferry vehicle
  deck with a real underground engine compartment. The central engine divides
  the basement into two lanes. Both stairs are inside the purchased ship area;
  this route cannot bypass a closed ship gate. No zombies spawn underground.

The native stair landings are deliberately clear: surface at y155 and basement
at y143. The upgrade machine occupies the broad aft deck at y163. Mystery-box
positions include the departures luggage bay, freight pier, foredeck and engine
deck. Perk, power, box and upgrade behavior uses the existing zombie rules.

## Art and collision contract

`shared/defs/maps/survival/highWater.ts` is the full authored layout, including
zones, layers, doors, props, stair positions, entries and stations. Bespoke props
include the evacuation ambulance, cars, baggage conveyors, terminal benches,
ship helm, lifeboat, crane footing, shore generator and central engine. Their
visible footprints must match their declared width/height and orientation.

Use cold petrol-green water, pale weathered concrete, oxidized orange ship paint,
cream interior walls and warm sodium lamps. Water is outside the walkable zone
polygons. Railings, shore edges and the tapered hull need clear solid collision;
wet floor marks, ropes, paint and stains remain decorative. Do not add opaque
fog, obstructive roof silhouettes or giant shadows that resemble false cover.

All playable space uses one surface level plus the native engine basement.
There are no simulated slopes, jump gaps, moving water hazards or new wave rules.
