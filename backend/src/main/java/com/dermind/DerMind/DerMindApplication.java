package com.dermind.DerMind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DerMindApplication {

	public static void main(String[] args) {
		SpringApplication.run(DerMindApplication.class, args);
	}
}