package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI 对话历史分页结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatHistoryPageVo {
    /** 消息列表（按时间升序，便于前端展示） */
    private List<AiChatHistoryItemVo> items;
    /** 下一页游标（最小的记录ID），null表示没有更多数据 */
    private Long nextCursor;
    /** 是否还有更多数据 */
    private Boolean hasMore;
    /** 总记录数 */
    private Long total;
}
