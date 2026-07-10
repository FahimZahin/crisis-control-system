package com.crisiscontrol;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CrisisControlSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(CrisisControlSystemApplication.class, args);
	}
}