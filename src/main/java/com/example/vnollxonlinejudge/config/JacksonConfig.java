package com.example.vnollxonlinejudge.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.ContextualSerializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

/**
 * Jackson 配置类
 * 解决 snowflakeId 的 JavaScript 精度丢失问题：将 snowflakeId 字段序列化为字符串
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jackson2ObjectMapperBuilderCustomizer() {
        return builder -> {
            // 只针对超大 Long 值（如 snowflakeId）序列化为字符串
            // 使用自定义序列化器，判断字段名
            builder.serializerByType(Long.class, new SnowflakeIdAwareSerializer());
            builder.serializerByType(Long.TYPE, new SnowflakeIdAwareSerializer());
        };
    }

    /**
     * 自定义 Long 序列化器：只将 snowflakeId 字段转为字符串
     */
    static class SnowflakeIdAwareSerializer extends JsonSerializer<Long> implements ContextualSerializer {
        private String fieldName;

        @Override
        public void serialize(Long value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            if (value == null) {
                gen.writeNull();
                return;
            }

            // 如果字段名包含 "snowflake" 或者值超过 JavaScript 安全整数范围，转为字符串
            if ((fieldName != null && fieldName.toLowerCase().contains("snowflake")) 
                || Math.abs(value) > 9007199254740991L) {
                gen.writeString(String.valueOf(value));
            } else {
                gen.writeNumber(value);
            }
        }

        @Override
        public JsonSerializer<?> createContextual(SerializerProvider prov, BeanProperty property) {
            SnowflakeIdAwareSerializer serializer = new SnowflakeIdAwareSerializer();
            if (property != null) {
                serializer.fieldName = property.getName();
            }
            return serializer;
        }
    }
}
