package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.domain.Submission;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.utils.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubmissionServiceImpl implements SubmissionService {
    private static final Logger logger = LoggerFactory.getLogger(ProblemService.class);
    @Autowired
    private SubmissionMapper submissionMapper;
    @Override
    public Result createSubmission(String code,String user_name,String product_name, String status, String create_time, String language,long uid,long pid, int time,long cid) {
        try {
            submissionMapper.addSubmission(user_name,product_name,code,status,create_time,language,uid,pid,time,cid);
            return Result.Success("添加记录成功");
        } catch (Exception e) {
            logger.error("添加记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmission(int offset, int size) {
        try {
            List<Submission> submissions=submissionMapper.getSubmission(offset,size);
            return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionByUid(long uid,int offset, int size) {
        try {
            List<Submission> submissions=submissionMapper.getSubmissionByUid(uid,offset,size);
            return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    public Result getSubmissionById(long id){
        try {
            Submission submission=submissionMapper.getSubmissionById(id);
            if (submission==null){
                return Result.LogicError("提交记录不存在");
            }
            return Result.Success(submission,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result getSubmissionCount(long uid){
        try {
            int count=submissionMapper.getSubmissionCount(uid);
            return Result.Success(count,"获取提交记录数量成功");
        }catch (Exception e){
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionCountByCid(long cid) {
        try {
            int count=submissionMapper.getSubmissionCountByCid(cid);
            return Result.Success(count,"获取提交记录数量成功");
        }catch (Exception e){
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionByCid(long cid,int offset,int size) {
        try {
            List<Submission> submissions=submissionMapper.getSubmissionByCid(cid,offset,size);
            return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getAllSubmissionCount(){
        try {
            int count=submissionMapper.getAllSubmissionCount();
            return Result.Success(count,"获取提交记录数量成功");
        }catch (Exception e){
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionByStatusAndLanguage(String status, String language, int offset, int size) {
        try{
        List<Submission> submissions=submissionMapper.getSubmissionByStatusAndLanguage(status,language,offset,size);
        return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e) {
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getCountByStatusAndLanguage(String status, String language) {
        try {
            int count = submissionMapper.getCountByStatusAndLanguage(status, language);
            return Result.Success(count, "获取提交记录数量成功");
        }catch (Exception e) {
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
}
