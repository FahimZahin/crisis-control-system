package com.crisiscontrol.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FuelCollectionRequest {

    @NotNull(message = "Pump ID is required")
    private Long pumpId;

    @NotBlank(message = "Collection code is required")
    private String collectionCode;
}