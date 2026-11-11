package com.social.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Disable context load test trong môi trường test đơn vị (tránh kết nối remote PostgreSQL neon.tech)")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
