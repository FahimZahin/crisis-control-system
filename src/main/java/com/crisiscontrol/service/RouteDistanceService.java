package com.crisiscontrol.service;

import com.crisiscontrol.dto.RouteDistanceResponse;
import com.crisiscontrol.helper.BangladeshDistrictInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RouteDistanceService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    /*
     * Straight line distance is multiplied to estimate road distance.
     * Bangladesh routes are not straight because of rivers, bridges, highways,
     * ferry routes, city detours, and road network shape.
     */
    private static final BigDecimal DEFAULT_ROAD_FACTOR = BigDecimal.valueOf(1.35);

    /*
     * Optional known route overrides. Add more if you want exact demo routes.
     * Key format must be smallerNormalized|largerNormalized.
     */
    private static final Map<String, BigDecimal> KNOWN_ROAD_DISTANCE_OVERRIDES = Map.ofEntries(
            Map.entry(routeKey("Dhaka", "Chattogram"), BigDecimal.valueOf(250)),
            Map.entry(routeKey("Dhaka", "Cox's Bazar"), BigDecimal.valueOf(390)),
            Map.entry(routeKey("Dhaka", "Sylhet"), BigDecimal.valueOf(240)),
            Map.entry(routeKey("Dhaka", "Rajshahi"), BigDecimal.valueOf(245)),
            Map.entry(routeKey("Dhaka", "Khulna"), BigDecimal.valueOf(270)),
            Map.entry(routeKey("Dhaka", "Barishal"), BigDecimal.valueOf(180)),
            Map.entry(routeKey("Dhaka", "Rangpur"), BigDecimal.valueOf(310)),
            Map.entry(routeKey("Dhaka", "Mymensingh"), BigDecimal.valueOf(120)),
            Map.entry(routeKey("Faridpur", "Cox's Bazar"), BigDecimal.valueOf(430)),
            Map.entry(routeKey("Faridpur", "Chattogram"), BigDecimal.valueOf(290)),
            Map.entry(routeKey("Faridpur", "Dhaka"), BigDecimal.valueOf(115))
    );

    private final BangladeshDistrictService bangladeshDistrictService;

    public RouteDistanceResponse calculateDistance(String sourceDistrictName, String destinationDistrictName) {
        BangladeshDistrictInfo source = bangladeshDistrictService.findDistrict(sourceDistrictName)
                .orElseThrow(() -> new RuntimeException("Source district is not supported: " + sourceDistrictName));

        BangladeshDistrictInfo destination = bangladeshDistrictService.findDistrict(destinationDistrictName)
                .orElseThrow(() -> new RuntimeException("Destination district is not supported: " + destinationDistrictName));

        if (normalize(source.getDistrictName()).equals(normalize(destination.getDistrictName()))) {
            return RouteDistanceResponse.builder()
                    .sourceDistrict(source.getDistrictName())
                    .destinationDistrict(destination.getDistrictName())
                    .straightDistanceKm(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .estimatedRoadDistanceKm(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .calculationType("SAME_DISTRICT")
                    .note("Source and destination are the same district.")
                    .build();
        }

        BigDecimal straightDistance = calculateHaversineDistance(
                source.getLatitude(),
                source.getLongitude(),
                destination.getLatitude(),
                destination.getLongitude()
        );

        String key = routeKey(source.getDistrictName(), destination.getDistrictName());

        BigDecimal roadDistance;
        String calculationType;
        String note;

        if (KNOWN_ROAD_DISTANCE_OVERRIDES.containsKey(key)) {
            roadDistance = KNOWN_ROAD_DISTANCE_OVERRIDES.get(key).setScale(2, RoundingMode.HALF_UP);
            calculationType = "KNOWN_ROUTE_OVERRIDE";
            note = "This route uses configured road distance for better demo accuracy.";
        } else {
            roadDistance = straightDistance
                    .multiply(DEFAULT_ROAD_FACTOR)
                    .setScale(2, RoundingMode.HALF_UP);

            calculationType = "AUTO_ESTIMATED";
            note = "Estimated from district coordinates using road factor. For production, replace with map API or official road distance.";
        }

        return RouteDistanceResponse.builder()
                .sourceDistrict(source.getDistrictName())
                .destinationDistrict(destination.getDistrictName())
                .straightDistanceKm(straightDistance)
                .estimatedRoadDistanceKm(roadDistance)
                .calculationType(calculationType)
                .note(note)
                .build();
    }

    public BigDecimal getEstimatedRoadDistanceKm(String sourceDistrictName, String destinationDistrictName) {
        return calculateDistance(sourceDistrictName, destinationDistrictName).getEstimatedRoadDistanceKm();
    }

    private BigDecimal calculateHaversineDistance(
            double sourceLatitude,
            double sourceLongitude,
            double destinationLatitude,
            double destinationLongitude
    ) {
        double latDistance = Math.toRadians(destinationLatitude - sourceLatitude);
        double lonDistance = Math.toRadians(destinationLongitude - sourceLongitude);

        double sourceLatRad = Math.toRadians(sourceLatitude);
        double destinationLatRad = Math.toRadians(destinationLatitude);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(sourceLatRad)
                * Math.cos(destinationLatRad)
                * Math.sin(lonDistance / 2)
                * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return BigDecimal.valueOf(EARTH_RADIUS_KM * c)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static String routeKey(String districtOne, String districtTwo) {
        String first = normalize(districtOne);
        String second = normalize(districtTwo);

        if (first.compareTo(second) <= 0) {
            return first + "|" + second;
        }

        return second + "|" + first;
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.trim()
                .toLowerCase()
                .replace("’", "'")
                .replace("`", "'")
                .replace(".", "")
                .replace("-", "")
                .replace("_", "")
                .replaceAll("\\s+", "");
    }
}